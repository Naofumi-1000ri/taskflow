/**
 * Quality Assistance Tools
 * Provides suggestions for improving task quality (titles, descriptions, priorities, labels)
 */

import {
  getProjectTasks,
  getTask,
  getProjectLabels,
} from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';
import type { Task, Label } from '@/types';
import { getAllDependentTasks, isTaskOverdue } from '@/lib/utils/task';

// ============================================
// suggest_improvements - タスク改善提案
// ============================================

export interface SuggestImprovementsArgs {
  taskId?: string;
  includeAllTasks?: boolean;
}

export type ImprovementType =
  | 'title'
  | 'description'
  | 'priority'
  | 'labels'
  | 'duration'
  | 'dates';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface Suggestion {
  type: ImprovementType;
  current: string | null;
  suggested: string;
  reason: string;
  confidence: ConfidenceLevel;
}

export interface TaskImprovement {
  taskId: string;
  taskTitle: string;
  suggestions: Suggestion[];
}

export interface SuggestImprovementsResult {
  improvements: TaskImprovement[];
  totalSuggestions: number;
  summary: string;
}

export const suggestImprovementsToolDefinition: AITool = {
  name: 'suggest_improvements',
  description:
    'タスクの品質を向上させるための提案を行います。タイトル、説明、優先度、ラベルの改善案を提示します。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: '分析対象のタスクID。省略時はincludeAllTasksをtrueにして全タスク分析。',
      },
      includeAllTasks: {
        type: 'boolean',
        description: 'trueの場合、全ての未完了タスクを分析します。taskIdと併用可能。',
      },
    },
    required: [],
  },
};

/**
 * Analyze a title for quality issues
 */
function analyzeTitleQuality(title: string): Suggestion | null {
  const issues: string[] = [];
  let suggested = title;
  let confidence: ConfidenceLevel = 'medium';

  // Check if too short
  if (title.length < 5) {
    issues.push('タイトルが短すぎます');
    confidence = 'high';
  }

  // Check if lacks action verb (Japanese)
  const actionVerbs = ['する', 'つくる', '作成', '実装', '修正', '確認', '調査', '追加', '削除', '更新', '設計', '開発', 'レビュー', 'テスト'];
  const hasActionVerb = actionVerbs.some((verb) => title.includes(verb));

  if (!hasActionVerb && title.length > 2) {
    issues.push('アクション（動詞）が含まれていません');
    // Suggest adding "を〜する"
    if (!title.endsWith('する') && !title.endsWith('く') && !title.endsWith('る')) {
      suggested = `${title}を実施する`;
    }
    confidence = 'medium';
  }

  // Check for vague words
  const vagueWords = ['など', 'とか', '〜関係', '〜的な', 'いろいろ', '諸々'];
  const hasVagueWord = vagueWords.some((word) => title.includes(word));

  if (hasVagueWord) {
    issues.push('曖昧な表現が含まれています');
    confidence = 'medium';
  }

  if (issues.length === 0) {
    return null;
  }

  return {
    type: 'title',
    current: title,
    suggested: suggested !== title ? suggested : null,
    reason: issues.join('。'),
    confidence,
  } as Suggestion;
}

/**
 * Analyze description for quality issues
 */
function analyzeDescriptionQuality(
  description: string,
  title: string
): Suggestion | null {
  const issues: string[] = [];
  let confidence: ConfidenceLevel = 'low';

  // Check if empty or too short
  if (!description || description.trim().length < 10) {
    issues.push('説明が不足しています');
    confidence = 'medium';
  }

  // Check for acceptance criteria keywords
  const acceptanceCriteriaKeywords = [
    '完了条件',
    '受け入れ条件',
    'Done',
    '確認項目',
    'チェック',
    '要件',
    '仕様',
  ];
  const hasAcceptanceCriteria = acceptanceCriteriaKeywords.some((kw) =>
    description.includes(kw)
  );

  if (description && description.length > 20 && !hasAcceptanceCriteria) {
    issues.push('完了条件/受け入れ条件が明記されていません');
    confidence = 'low';
  }

  if (issues.length === 0) {
    return null;
  }

  return {
    type: 'description',
    current: description || '(未設定)',
    suggested: `${description || ''}\n\n## 完了条件\n- [ ] 〜が完了していること\n- [ ] 〜が確認されていること`,
    reason: issues.join('。'),
    confidence,
  };
}

/**
 * Suggest priority based on task characteristics
 */
function suggestPriority(
  task: Task,
  allTasks: Task[]
): Suggestion | null {
  let suggestedPriority: 'high' | 'medium' | 'low' | null = null;
  let reason = '';
  let confidence: ConfidenceLevel = 'low';

  // Check if overdue
  if (isTaskOverdue(task)) {
    suggestedPriority = 'high';
    reason = '期限を過ぎています';
    confidence = 'high';
  }

  // Check if due soon (within 3 days)
  if (!suggestedPriority && task.dueDate) {
    const daysUntilDue = Math.ceil(
      (task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDue <= 3 && daysUntilDue > 0) {
      suggestedPriority = 'high';
      reason = `期限まで${daysUntilDue}日です`;
      confidence = 'medium';
    }
  }

  // Check dependency chain depth
  if (!suggestedPriority) {
    const dependents = getAllDependentTasks(task.id, allTasks);
    if (dependents.length >= 3) {
      suggestedPriority = 'high';
      reason = `${dependents.length}個のタスクがこのタスクに依存しています`;
      confidence = 'medium';
    } else if (dependents.length >= 1) {
      suggestedPriority = 'medium';
      reason = `${dependents.length}個のタスクがこのタスクに依存しています`;
      confidence = 'low';
    }
  }

  // Only suggest if different from current
  if (suggestedPriority && suggestedPriority !== task.priority) {
    return {
      type: 'priority',
      current: task.priority || '(未設定)',
      suggested: suggestedPriority,
      reason,
      confidence,
    };
  }

  return null;
}

/**
 * Suggest labels based on task content
 */
function suggestLabels(
  task: Task,
  availableLabels: Label[]
): Suggestion | null {
  if (availableLabels.length === 0) {
    return null;
  }

  const text = `${task.title} ${task.description}`.toLowerCase();
  const suggestedLabelIds: string[] = [];
  const suggestedLabelNames: string[] = [];

  // Keyword-based label matching
  const labelKeywords: Record<string, string[]> = {
    バグ: ['バグ', 'bug', '不具合', 'エラー', 'error', '修正'],
    機能: ['機能', 'feature', '新規', '追加', '実装'],
    改善: ['改善', '改良', 'improvement', 'リファクタ', '最適化'],
    ドキュメント: ['ドキュメント', 'doc', '文書', 'readme', '説明'],
    テスト: ['テスト', 'test', '検証', 'qa'],
    デザイン: ['デザイン', 'design', 'ui', 'ux', '画面'],
    インフラ: ['インフラ', 'infra', 'サーバー', 'デプロイ', 'ci', 'cd'],
    セキュリティ: ['セキュリティ', 'security', '認証', '権限'],
  };

  for (const label of availableLabels) {
    // Skip if already assigned
    if (task.labelIds.includes(label.id)) {
      continue;
    }

    const labelNameLower = label.name.toLowerCase();

    // Check if label name keywords match task content
    const keywords = labelKeywords[label.name] || [labelNameLower];
    const matches = keywords.some((kw) => text.includes(kw.toLowerCase()));

    if (matches) {
      suggestedLabelIds.push(label.id);
      suggestedLabelNames.push(label.name);
    }
  }

  if (suggestedLabelNames.length === 0) {
    return null;
  }

  return {
    type: 'labels',
    current:
      task.labelIds.length > 0
        ? `${task.labelIds.length}個のラベル`
        : '(未設定)',
    suggested: suggestedLabelNames.join(', '),
    reason: 'タスクの内容に基づいて推測しました',
    confidence: 'low',
  };
}

/**
 * Suggest duration based on task complexity
 */
function suggestDuration(task: Task): Suggestion | null {
  if (task.durationDays) {
    return null; // Already has duration
  }

  if (!task.startDate && !task.dueDate) {
    return null; // No date info to work with
  }

  // Suggest based on task title complexity
  const complexityIndicators = {
    high: ['設計', '開発', '実装', 'リファクタ', '移行', '統合'],
    medium: ['作成', '追加', '修正', '更新', 'テスト'],
    low: ['確認', 'レビュー', '調査', '報告'],
  };

  let suggestedDays = 1;
  let confidence: ConfidenceLevel = 'low';

  const titleLower = task.title.toLowerCase();

  if (complexityIndicators.high.some((kw) => titleLower.includes(kw))) {
    suggestedDays = 3;
    confidence = 'medium';
  } else if (complexityIndicators.medium.some((kw) => titleLower.includes(kw))) {
    suggestedDays = 2;
    confidence = 'medium';
  } else {
    suggestedDays = 1;
    confidence = 'low';
  }

  return {
    type: 'duration',
    current: '(未設定)',
    suggested: `${suggestedDays}日`,
    reason: 'タスクのタイトルから推測した標準的な所要日数です',
    confidence,
  };
}

export const suggestImprovementsHandler: ToolHandler<
  SuggestImprovementsArgs,
  SuggestImprovementsResult
> = async (args, context) => {
  const { taskId, includeAllTasks } = args;
  const { projectId } = context;

  const improvements: TaskImprovement[] = [];
  let tasksToAnalyze: Task[] = [];

  // Get all tasks and labels
  const [allTasks, labels] = await Promise.all([
    getProjectTasks(projectId),
    getProjectLabels(projectId),
  ]);

  // Determine which tasks to analyze
  if (taskId) {
    const task = await getTask(projectId, taskId);
    if (!task) {
      throw new Error('タスクが見つかりません');
    }
    tasksToAnalyze = [task];
  }

  if (includeAllTasks || (!taskId && !includeAllTasks)) {
    // Default to analyzing incomplete tasks
    const incompleteTasks = allTasks.filter((t) => !t.isCompleted);
    tasksToAnalyze = [
      ...tasksToAnalyze,
      ...incompleteTasks.filter(
        (t) => !tasksToAnalyze.some((existing) => existing.id === t.id)
      ),
    ];
  }

  // Analyze each task
  for (const task of tasksToAnalyze) {
    const suggestions: Suggestion[] = [];

    // Analyze title
    const titleSuggestion = analyzeTitleQuality(task.title);
    if (titleSuggestion) {
      suggestions.push(titleSuggestion);
    }

    // Analyze description
    const descSuggestion = analyzeDescriptionQuality(
      task.description,
      task.title
    );
    if (descSuggestion) {
      suggestions.push(descSuggestion);
    }

    // Suggest priority
    const prioritySuggestion = suggestPriority(task, allTasks);
    if (prioritySuggestion) {
      suggestions.push(prioritySuggestion);
    }

    // Suggest labels
    const labelSuggestion = suggestLabels(task, labels);
    if (labelSuggestion) {
      suggestions.push(labelSuggestion);
    }

    // Suggest duration
    const durationSuggestion = suggestDuration(task);
    if (durationSuggestion) {
      suggestions.push(durationSuggestion);
    }

    if (suggestions.length > 0) {
      improvements.push({
        taskId: task.id,
        taskTitle: task.title,
        suggestions,
      });
    }
  }

  // Generate summary
  const totalSuggestions = improvements.reduce(
    (sum, imp) => sum + imp.suggestions.length,
    0
  );

  let summary = '';
  if (improvements.length === 0) {
    summary = '分析対象のタスクに改善提案はありません。';
  } else {
    const highConfidence = improvements.flatMap((i) =>
      i.suggestions.filter((s) => s.confidence === 'high')
    ).length;
    summary = `${improvements.length}個のタスクに対して${totalSuggestions}件の改善提案があります。`;
    if (highConfidence > 0) {
      summary += `うち${highConfidence}件は優先度の高い提案です。`;
    }
  }

  return {
    improvements,
    totalSuggestions,
    summary,
  };
};
