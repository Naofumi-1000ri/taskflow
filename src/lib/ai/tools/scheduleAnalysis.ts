/**
 * Schedule Analysis Tools
 * Provides tools for analyzing task schedules, suggesting changes, and notifying about delays
 */

import { getProjectTasks } from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';
import type { Task } from '@/types';
import {
  getEffectiveDates,
  getAllDependentTasks,
  getBottleneckTask,
  getDependencyTasks,
  isTaskBlocked,
} from '@/lib/utils/task';
import { addDays, differenceInDays } from 'date-fns';

// ============================================
// suggest_schedule_changes - スケジュール変更提案
// ============================================

export interface SuggestScheduleChangesArgs {
  targetTaskId?: string;
  deadline?: string;
}

export type ScheduleSuggestionType =
  | 'reschedule'
  | 'split'
  | 'reassign'
  | 'reduce_scope'
  | 'parallel'
  | 'remove_dependency';

export interface SuggestedChange {
  newStartDate?: string;
  newDueDate?: string;
  newDuration?: number;
  splitInto?: number;
  removeDependencyIds?: string[];
}

export interface ScheduleSuggestion {
  type: ScheduleSuggestionType;
  taskId: string;
  taskTitle: string;
  reason: string;
  suggestedChanges: SuggestedChange;
  impact: {
    daysGained: number;
    affectedTasks: string[];
  };
}

export interface SuggestScheduleChangesResult {
  suggestions: ScheduleSuggestion[];
  criticalPath: Array<{ id: string; title: string; durationDays: number | null }>;
  totalCriticalPathDays: number;
  bottleneckTasks: Array<{ id: string; title: string; reason: string }>;
}

export const suggestScheduleChangesToolDefinition: AITool = {
  name: 'suggest_schedule_changes',
  description:
    '期限を守るためにどのタスクを調整すべきか分析し、提案を行います。クリティカルパスとボトルネックを特定します。',
  parameters: {
    type: 'object',
    properties: {
      targetTaskId: {
        type: 'string',
        description: '分析対象のタスクID。省略時は全タスクを分析。',
      },
      deadline: {
        type: 'string',
        description: '目標期限（ISO 8601形式）。この期限に間に合うようなスケジュール調整を提案。',
      },
    },
    required: [],
  },
};

/**
 * Build dependency graph and find critical path
 */
function findCriticalPath(tasks: Task[]): Task[] {
  // Build a map of tasks
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Find all "leaf" tasks (tasks that no other task depends on)
  const dependedOnIds = new Set<string>();
  for (const task of tasks) {
    if (task.dependsOnTaskIds) {
      for (const depId of task.dependsOnTaskIds) {
        dependedOnIds.add(depId);
      }
    }
  }

  const leafTasks = tasks.filter(
    (t) => !dependedOnIds.has(t.id) && !t.isCompleted
  );

  // For each leaf, trace back to find the longest path
  let longestPath: Task[] = [];
  let longestDuration = 0;

  function tracePath(task: Task, currentPath: Task[], currentDuration: number) {
    const newPath = [task, ...currentPath];
    const taskDuration = task.durationDays || 1;
    const newDuration = currentDuration + taskDuration;

    // Get dependencies
    const deps = getDependencyTasks(task, tasks).filter((t) => !t.isCompleted);

    if (deps.length === 0) {
      // End of path
      if (newDuration > longestDuration) {
        longestPath = newPath;
        longestDuration = newDuration;
      }
    } else {
      // Continue tracing
      for (const dep of deps) {
        tracePath(dep, newPath, newDuration);
      }
    }
  }

  for (const leaf of leafTasks) {
    tracePath(leaf, [], 0);
  }

  return longestPath;
}

/**
 * Find bottleneck tasks (tasks that cause the most delays)
 */
function findBottleneckTasks(
  tasks: Task[]
): Array<{ task: Task; dependentCount: number; reason: string }> {
  const bottlenecks: Array<{ task: Task; dependentCount: number; reason: string }> = [];

  for (const task of tasks) {
    if (task.isCompleted) continue;

    const dependents = getAllDependentTasks(task.id, tasks);
    const blockedDependents = dependents.filter((t) => isTaskBlocked(t, tasks));

    if (blockedDependents.length > 0) {
      // Check if this task is causing delays
      const hasOverduePrediction = getEffectiveDates(task, tasks).isDeadlineOverdue;

      if (hasOverduePrediction || !task.dueDate) {
        bottlenecks.push({
          task,
          dependentCount: dependents.length,
          reason: hasOverduePrediction
            ? '期限を超過する見込みで、他のタスクの開始を遅延させています'
            : '期限未設定で、依存タスクのスケジュールが不確定です',
        });
      }
    }
  }

  // Sort by impact (number of dependents)
  bottlenecks.sort((a, b) => b.dependentCount - a.dependentCount);

  return bottlenecks.slice(0, 5); // Return top 5
}

/**
 * Generate schedule change suggestions
 */
function generateSuggestions(
  tasks: Task[],
  targetTaskId?: string,
  deadline?: Date
): ScheduleSuggestion[] {
  const suggestions: ScheduleSuggestion[] = [];

  // Find critical path and bottlenecks
  const criticalPath = findCriticalPath(tasks);
  const bottlenecks = findBottleneckTasks(tasks);

  // If targeting a specific task, focus suggestions on that task's chain
  let relevantTasks = tasks;
  if (targetTaskId) {
    const targetTask = tasks.find((t) => t.id === targetTaskId);
    if (targetTask) {
      const deps = getDependencyTasks(targetTask, tasks);
      const dependents = getAllDependentTasks(targetTaskId, tasks);
      relevantTasks = [targetTask, ...deps, ...dependents];
    }
  }

  // Generate suggestions for bottleneck tasks
  for (const { task, reason } of bottlenecks) {
    if (targetTaskId && !relevantTasks.some((t) => t.id === task.id)) continue;

    const dependents = getAllDependentTasks(task.id, tasks);

    // Suggestion 1: Reschedule if duration is long
    if (task.durationDays && task.durationDays > 3) {
      const reducedDuration = Math.ceil(task.durationDays * 0.7);
      suggestions.push({
        type: 'reduce_scope',
        taskId: task.id,
        taskTitle: task.title,
        reason: `所要日数が${task.durationDays}日と長く、ボトルネックになっています`,
        suggestedChanges: {
          newDuration: reducedDuration,
        },
        impact: {
          daysGained: task.durationDays - reducedDuration,
          affectedTasks: dependents.map((t) => t.title),
        },
      });
    }

    // Suggestion 2: Split large tasks
    if (task.durationDays && task.durationDays > 5) {
      suggestions.push({
        type: 'split',
        taskId: task.id,
        taskTitle: task.title,
        reason: `大きなタスク（${task.durationDays}日）を分割して並行作業可能にすることを推奨`,
        suggestedChanges: {
          splitInto: Math.ceil(task.durationDays / 2),
        },
        impact: {
          daysGained: Math.floor(task.durationDays / 2),
          affectedTasks: dependents.map((t) => t.title),
        },
      });
    }

    // Suggestion 3: Remove unnecessary dependencies
    if (task.dependsOnTaskIds && task.dependsOnTaskIds.length > 1) {
      const blockingDeps = task.dependsOnTaskIds
        .map((id) => tasks.find((t) => t.id === id))
        .filter((t): t is Task => t !== undefined && !t.isCompleted);

      if (blockingDeps.length > 1) {
        const bottleneckDep = getBottleneckTask(task, tasks);
        if (bottleneckDep) {
          const otherDeps = blockingDeps.filter((d) => d.id !== bottleneckDep.id);
          if (otherDeps.length > 0) {
            suggestions.push({
              type: 'remove_dependency',
              taskId: task.id,
              taskTitle: task.title,
              reason: `複数の依存関係があり、並行化の余地があります`,
              suggestedChanges: {
                removeDependencyIds: otherDeps.map((d) => d.id),
              },
              impact: {
                daysGained: 0, // Depends on actual parallelization
                affectedTasks: otherDeps.map((d) => d.title),
              },
            });
          }
        }
      }
    }
  }

  // If deadline is specified, check if we need more aggressive suggestions
  if (deadline) {
    for (const task of criticalPath) {
      if (task.isCompleted) continue;

      const effectiveDates = getEffectiveDates(task, tasks);
      const predictedEnd = effectiveDates.predictedEnd || task.dueDate;

      if (predictedEnd && predictedEnd > deadline) {
        const daysOver = differenceInDays(predictedEnd, deadline);

        suggestions.push({
          type: 'reschedule',
          taskId: task.id,
          taskTitle: task.title,
          reason: `クリティカルパス上のタスクで、目標期限を${daysOver}日超過する見込みです`,
          suggestedChanges: {
            newDueDate: deadline.toISOString().split('T')[0],
            newDuration: task.durationDays
              ? Math.max(1, task.durationDays - daysOver)
              : undefined,
          },
          impact: {
            daysGained: daysOver,
            affectedTasks: getAllDependentTasks(task.id, tasks).map((t) => t.title),
          },
        });
      }
    }
  }

  return suggestions;
}

export const suggestScheduleChangesHandler: ToolHandler<
  SuggestScheduleChangesArgs,
  SuggestScheduleChangesResult
> = async (args, context) => {
  const { targetTaskId, deadline } = args;
  const { projectId } = context;

  const tasks = await getProjectTasks(projectId);
  const incompleteTasks = tasks.filter((t) => !t.isCompleted);

  const criticalPath = findCriticalPath(incompleteTasks);
  const bottlenecks = findBottleneckTasks(incompleteTasks);

  const deadlineDate = deadline ? new Date(deadline) : undefined;
  const suggestions = generateSuggestions(incompleteTasks, targetTaskId, deadlineDate);

  const totalCriticalPathDays = criticalPath.reduce(
    (sum, t) => sum + (t.durationDays || 1),
    0
  );

  return {
    suggestions,
    criticalPath: criticalPath.map((t) => ({
      id: t.id,
      title: t.title,
      durationDays: t.durationDays,
    })),
    totalCriticalPathDays,
    bottleneckTasks: bottlenecks.map((b) => ({
      id: b.task.id,
      title: b.task.title,
      reason: b.reason,
    })),
  };
};

// ============================================
// notify_dependency_delays - 依存遅延通知
// ============================================

export interface NotifyDependencyDelaysArgs {
  taskId: string;
  newEndDate?: string;
}

export interface DelayedTask {
  id: string;
  title: string;
  originalDueDate: string | null;
  newPredictedEnd: string;
  delayDays: number;
  assigneeIds: string[];
}

export interface NotifyDependencyDelaysResult {
  delayedTask: {
    id: string;
    title: string;
    originalEndDate: string | null;
    newEndDate: string;
  };
  affectedTasks: DelayedTask[];
  totalAffectedCount: number;
  criticalPathAffected: boolean;
}

export const notifyDependencyDelaysToolDefinition: AITool = {
  name: 'notify_dependency_delays',
  description:
    'タスクの遅延が他のタスクに与える影響を分析します。依存タスクの新しい予測終了日と遅延日数を計算します。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: '遅延したタスクのID（必須）',
      },
      newEndDate: {
        type: 'string',
        description:
          '新しい終了予定日（ISO 8601形式）。省略時は現在のdueDateを使用。',
      },
    },
    required: ['taskId'],
  },
};

export const notifyDependencyDelaysHandler: ToolHandler<
  NotifyDependencyDelaysArgs,
  NotifyDependencyDelaysResult
> = async (args, context) => {
  const { taskId, newEndDate } = args;
  const { projectId } = context;

  const tasks = await getProjectTasks(projectId);
  const delayedTask = tasks.find((t) => t.id === taskId);

  if (!delayedTask) {
    throw new Error('タスクが見つかりません');
  }

  const originalEndDate = delayedTask.dueDate;
  const newEnd = newEndDate ? new Date(newEndDate) : delayedTask.dueDate;

  if (!newEnd) {
    throw new Error('新しい終了日が指定されておらず、元のタスクにも期限がありません');
  }

  // Calculate delay
  const delayFromOriginal = originalEndDate
    ? differenceInDays(newEnd, originalEndDate)
    : 0;

  // Get all dependent tasks
  const affectedTasks = getAllDependentTasks(taskId, tasks);

  // Calculate new predicted end dates for each affected task
  const delayedTasksInfo: DelayedTask[] = [];

  for (const affected of affectedTasks) {
    // Calculate effective dates assuming the delayed task ends at newEnd
    // We need to simulate the new end date propagation

    // Original effective dates
    const originalDates = getEffectiveDates(affected, tasks);
    const originalPredictedEnd = originalDates.predictedEnd || affected.dueDate;

    // New predicted end = original predicted end + delay
    const newPredictedEnd = originalPredictedEnd
      ? addDays(originalPredictedEnd, Math.max(0, delayFromOriginal))
      : addDays(newEnd, affected.durationDays || 1);

    const delayDays = affected.dueDate
      ? Math.max(0, differenceInDays(newPredictedEnd, affected.dueDate))
      : 0;

    delayedTasksInfo.push({
      id: affected.id,
      title: affected.title,
      originalDueDate: affected.dueDate
        ? affected.dueDate.toISOString().split('T')[0]
        : null,
      newPredictedEnd: newPredictedEnd.toISOString().split('T')[0],
      delayDays,
      assigneeIds: affected.assigneeIds,
    });
  }

  // Check if critical path is affected
  const criticalPath = findCriticalPath(tasks.filter((t) => !t.isCompleted));
  const criticalPathAffected = criticalPath.some((t) =>
    affectedTasks.some((a) => a.id === t.id)
  );

  // Sort by delay days (most delayed first)
  delayedTasksInfo.sort((a, b) => b.delayDays - a.delayDays);

  return {
    delayedTask: {
      id: delayedTask.id,
      title: delayedTask.title,
      originalEndDate: originalEndDate
        ? originalEndDate.toISOString().split('T')[0]
        : null,
      newEndDate: newEnd.toISOString().split('T')[0],
    },
    affectedTasks: delayedTasksInfo,
    totalAffectedCount: delayedTasksInfo.length,
    criticalPathAffected,
  };
};
