/**
 * Personal AI Tools - Cross-project tools for individual users
 */

import { getUserProjects, getProjectTasks, getProjectLists } from '@/lib/firebase/firestore';
import { AITool, ToolHandler, ToolExecutionContext } from './types';
import type { Task, Project, List } from '@/types';
import { isTaskBlocked, getDependencyTasks } from '@/lib/utils/task';

// ============================================
// Helper types for cross-project tasks
// ============================================

export interface CrossProjectTask {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  listId: string;
  listName: string;
  priority: string | null;
  dueDate: string | null;
  startDate: string | null;
  isCompleted: boolean;
  isOverdue: boolean;
  isBlocked: boolean;
  assigneeIds: string[];
}

// ============================================
// get_my_tasks_across_projects - 全プロジェクトの自分のタスク
// ============================================

export interface GetMyTasksAcrossProjectsArgs {
  includeCompleted?: boolean;
  dueBefore?: string; // ISO date string
  priority?: 'high' | 'medium' | 'low';
}

export interface GetMyTasksAcrossProjectsResult {
  tasks: CrossProjectTask[];
  count: number;
  projectCount: number;
}

export const getMyTasksAcrossProjectsToolDefinition: AITool = {
  name: 'get_my_tasks_across_projects',
  description:
    '全プロジェクトを横断して、自分に割り当てられたタスクを取得します。期限や優先度でフィルタリングできます。',
  parameters: {
    type: 'object',
    properties: {
      includeCompleted: {
        type: 'boolean',
        description: '完了したタスクも含めるか（デフォルト: false）',
      },
      dueBefore: {
        type: 'string',
        description: 'この日までに期限のタスクのみ取得（ISO 8601形式: YYYY-MM-DD）',
      },
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: '優先度でフィルタ',
      },
    },
    required: [],
  },
};

export const getMyTasksAcrossProjectsHandler: ToolHandler<
  GetMyTasksAcrossProjectsArgs,
  GetMyTasksAcrossProjectsResult
> = async (args, context) => {
  const { includeCompleted = false, dueBefore, priority } = args;
  const { userId, projectIds } = context as ToolExecutionContext;

  if (!projectIds || projectIds.length === 0) {
    return { tasks: [], count: 0, projectCount: 0 };
  }

  const allTasks: CrossProjectTask[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueBeforeDate = dueBefore ? new Date(dueBefore) : null;

  // Fetch projects data
  const projects = await getUserProjects(userId);
  const projectMap = new Map<string, Project>();
  projects.forEach((p) => projectMap.set(p.id, p));

  // Process each project
  for (const projectId of projectIds) {
    const project = projectMap.get(projectId);
    if (!project) continue;

    const [tasks, lists] = await Promise.all([
      getProjectTasks(projectId),
      getProjectLists(projectId),
    ]);

    const listMap = new Map<string, List>();
    lists.forEach((l) => listMap.set(l.id, l));

    // Filter tasks assigned to current user
    let userTasks = tasks.filter((t) => t.assigneeIds.includes(userId));

    // Apply filters
    if (!includeCompleted) {
      userTasks = userTasks.filter((t) => !t.isCompleted);
    }

    if (priority) {
      userTasks = userTasks.filter((t) => t.priority === priority);
    }

    if (dueBeforeDate) {
      userTasks = userTasks.filter(
        (t) => t.dueDate && t.dueDate <= dueBeforeDate
      );
    }

    // Convert to cross-project format
    for (const task of userTasks) {
      const list = listMap.get(task.listId);
      const isOverdue = !task.isCompleted && task.dueDate && task.dueDate < today;
      const blocked = !task.isCompleted && isTaskBlocked(task, tasks);

      allTasks.push({
        id: task.id,
        title: task.title,
        description: task.description || '',
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
        listId: task.listId,
        listName: list?.name || 'Unknown',
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
        startDate: task.startDate ? task.startDate.toISOString().split('T')[0] : null,
        isCompleted: task.isCompleted,
        isOverdue: !!isOverdue,
        isBlocked: blocked,
        assigneeIds: task.assigneeIds,
      });
    }
  }

  // Sort by due date, then priority
  allTasks.sort((a, b) => {
    // Overdue tasks first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    // Then by due date
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && b.dueDate) {
      const cmp = a.dueDate.localeCompare(b.dueDate);
      if (cmp !== 0) return cmp;
    }

    // Then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = a.priority ? priorityOrder[a.priority as keyof typeof priorityOrder] : 3;
    const bPriority = b.priority ? priorityOrder[b.priority as keyof typeof priorityOrder] : 3;
    return aPriority - bPriority;
  });

  return {
    tasks: allTasks,
    count: allTasks.length,
    projectCount: projectIds.length,
  };
};

// ============================================
// get_workload_summary - ワークロードサマリー
// ============================================

export interface GetWorkloadSummaryArgs {
  // No arguments needed
}

export interface ProjectWorkload {
  projectId: string;
  projectName: string;
  projectColor: string;
  taskCount: number;
  overdueCount: number;
  dueTodayCount: number;
  highPriorityCount: number;
  blockedCount: number;
}

export interface WorkloadSummary {
  totalTasks: number;
  overdueCount: number;
  dueTodayCount: number;
  dueThisWeekCount: number;
  highPriorityCount: number;
  blockedCount: number;
  byProject: ProjectWorkload[];
  recommendation: string;
}

export const getWorkloadSummaryToolDefinition: AITool = {
  name: 'get_workload_summary',
  description:
    '全プロジェクトを横断したワークロードのサマリーを取得します。期限切れ、今日・今週の期限、優先度、ブロック状態を分析します。',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const getWorkloadSummaryHandler: ToolHandler<
  GetWorkloadSummaryArgs,
  WorkloadSummary
> = async (_args, context) => {
  const { userId, projectIds } = context as ToolExecutionContext;

  if (!projectIds || projectIds.length === 0) {
    return {
      totalTasks: 0,
      overdueCount: 0,
      dueTodayCount: 0,
      dueThisWeekCount: 0,
      highPriorityCount: 0,
      blockedCount: 0,
      byProject: [],
      recommendation: 'プロジェクトがありません。',
    };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let totalTasks = 0;
  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueThisWeekCount = 0;
  let highPriorityCount = 0;
  let blockedCount = 0;
  const byProject: ProjectWorkload[] = [];

  const projects = await getUserProjects(userId);
  const projectMap = new Map<string, Project>();
  projects.forEach((p) => projectMap.set(p.id, p));

  for (const projectId of projectIds) {
    const project = projectMap.get(projectId);
    if (!project) continue;

    const tasks = await getProjectTasks(projectId);
    const myTasks = tasks.filter(
      (t) => t.assigneeIds.includes(userId) && !t.isCompleted
    );

    let projectOverdue = 0;
    let projectDueToday = 0;
    let projectHighPriority = 0;
    let projectBlocked = 0;

    for (const task of myTasks) {
      if (task.dueDate) {
        if (task.dueDate < today) {
          overdueCount++;
          projectOverdue++;
        } else if (task.dueDate >= today && task.dueDate < tomorrow) {
          dueTodayCount++;
          projectDueToday++;
        } else if (task.dueDate >= today && task.dueDate < weekEnd) {
          dueThisWeekCount++;
        }
      }

      if (task.priority === 'high') {
        highPriorityCount++;
        projectHighPriority++;
      }

      if (isTaskBlocked(task, tasks)) {
        blockedCount++;
        projectBlocked++;
      }
    }

    totalTasks += myTasks.length;

    if (myTasks.length > 0) {
      byProject.push({
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
        taskCount: myTasks.length,
        overdueCount: projectOverdue,
        dueTodayCount: projectDueToday,
        highPriorityCount: projectHighPriority,
        blockedCount: projectBlocked,
      });
    }
  }

  // Sort projects by urgency (overdue + due today)
  byProject.sort((a, b) => {
    const aUrgency = a.overdueCount + a.dueTodayCount;
    const bUrgency = b.overdueCount + b.dueTodayCount;
    return bUrgency - aUrgency;
  });

  // Generate recommendation
  let recommendation = '';
  if (overdueCount > 0) {
    recommendation = `${overdueCount}件の期限切れタスクがあります。まずこれらを優先的に対応することをお勧めします。`;
  } else if (dueTodayCount > 0) {
    recommendation = `今日期限のタスクが${dueTodayCount}件あります。本日中の完了を目指しましょう。`;
  } else if (highPriorityCount > 0) {
    recommendation = `高優先度タスクが${highPriorityCount}件あります。これらに集中することをお勧めします。`;
  } else if (blockedCount > 0) {
    recommendation = `${blockedCount}件のタスクがブロックされています。依存関係の解消を検討してください。`;
  } else if (totalTasks > 0) {
    recommendation = `順調に進んでいます。${dueThisWeekCount}件の今週期限のタスクに取り組みましょう。`;
  } else {
    recommendation = '現在割り当てられたタスクはありません。';
  }

  return {
    totalTasks,
    overdueCount,
    dueTodayCount,
    dueThisWeekCount,
    highPriorityCount,
    blockedCount,
    byProject,
    recommendation,
  };
};

// ============================================
// suggest_work_priority - 作業優先順位提案
// ============================================

export interface SuggestWorkPriorityArgs {
  availableHours?: number;
  focusProjectId?: string;
}

export interface PrioritizedTask {
  rank: number;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  reason: string;
  dueDate: string | null;
  priority: string | null;
  isOverdue: boolean;
  isBlocked: boolean;
  estimatedMinutes?: number;
}

export interface WorkPrioritySuggestion {
  suggestedOrder: PrioritizedTask[];
  summary: string;
  totalEstimatedMinutes?: number;
}

export const suggestWorkPriorityToolDefinition: AITool = {
  name: 'suggest_work_priority',
  description:
    '全プロジェクトを横断して、作業優先順位を提案します。期限、優先度、依存関係、ブロック状態を考慮します。',
  parameters: {
    type: 'object',
    properties: {
      availableHours: {
        type: 'number',
        description: '今日使える時間（時間単位）',
      },
      focusProjectId: {
        type: 'string',
        description: '特定のプロジェクトに集中したい場合、そのプロジェクトID',
      },
    },
    required: [],
  },
};

export const suggestWorkPriorityHandler: ToolHandler<
  SuggestWorkPriorityArgs,
  WorkPrioritySuggestion
> = async (args, context) => {
  const { availableHours, focusProjectId } = args;
  const { userId, projectIds } = context as ToolExecutionContext;

  if (!projectIds || projectIds.length === 0) {
    return {
      suggestedOrder: [],
      summary: 'プロジェクトがありません。',
    };
  }

  const targetProjectIds = focusProjectId
    ? [focusProjectId]
    : projectIds;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const allTasks: Array<{
    task: Task;
    project: Project;
    listName: string;
    allProjectTasks: Task[];
  }> = [];

  const projects = await getUserProjects(userId);
  const projectMap = new Map<string, Project>();
  projects.forEach((p) => projectMap.set(p.id, p));

  for (const projectId of targetProjectIds) {
    const project = projectMap.get(projectId);
    if (!project) continue;

    const [tasks, lists] = await Promise.all([
      getProjectTasks(projectId),
      getProjectLists(projectId),
    ]);

    const listMap = new Map<string, List>();
    lists.forEach((l) => listMap.set(l.id, l));

    const myTasks = tasks.filter(
      (t) => t.assigneeIds.includes(userId) && !t.isCompleted
    );

    for (const task of myTasks) {
      const list = listMap.get(task.listId);
      allTasks.push({
        task,
        project,
        listName: list?.name || 'Unknown',
        allProjectTasks: tasks,
      });
    }
  }

  // Scoring function for priority
  const scoreTask = (item: typeof allTasks[0]): number => {
    const { task, allProjectTasks } = item;
    let score = 0;

    // Check if blocked
    const blocked = isTaskBlocked(task, allProjectTasks);
    if (blocked) {
      score -= 100; // Deprioritize blocked tasks
    }

    // Overdue tasks get highest priority
    if (task.dueDate && task.dueDate < today) {
      const daysOverdue = Math.ceil(
        (today.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      score += 1000 + daysOverdue * 10;
    }

    // Due today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (task.dueDate && task.dueDate >= today && task.dueDate < tomorrow) {
      score += 500;
    }

    // Priority score
    if (task.priority === 'high') score += 100;
    else if (task.priority === 'medium') score += 50;
    else if (task.priority === 'low') score += 10;

    // Tasks that block others should be done first
    const dependents = allProjectTasks.filter(
      (t) => t.dependsOnTaskIds.includes(task.id) && !t.isCompleted
    );
    score += dependents.length * 30;

    // Due within a week
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (task.dueDate && task.dueDate >= today && task.dueDate < weekEnd) {
      score += 25;
    }

    return score;
  };

  // Score and sort tasks
  const scoredTasks = allTasks
    .map((item) => ({ ...item, score: scoreTask(item) }))
    .filter((item) => !isTaskBlocked(item.task, item.allProjectTasks) || item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Generate prioritized list
  const suggestedOrder: PrioritizedTask[] = [];
  let rank = 1;

  for (const item of scoredTasks.slice(0, 10)) {
    const { task, project, allProjectTasks } = item;
    const isOverdue = task.dueDate && task.dueDate < today;
    const blocked = isTaskBlocked(task, allProjectTasks);

    // Generate reason
    let reason = '';
    if (blocked) {
      reason = '依存タスクの完了待ち';
    } else if (isOverdue) {
      const daysOverdue = Math.ceil(
        (today.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24)
      );
      reason = `期限を${daysOverdue}日超過`;
    } else if (task.dueDate) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (task.dueDate >= today && task.dueDate < tomorrow) {
        reason = '本日期限';
      } else {
        const daysUntil = Math.ceil(
          (task.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        reason = `${daysUntil}日後期限`;
      }
    } else if (task.priority === 'high') {
      reason = '高優先度';
    } else {
      reason = '通常タスク';
    }

    // Check if this task blocks others
    const blockedTasks = allProjectTasks.filter(
      (t) => t.dependsOnTaskIds.includes(task.id) && !t.isCompleted
    );
    if (blockedTasks.length > 0) {
      reason += `（${blockedTasks.length}件のタスクをブロック中）`;
    }

    suggestedOrder.push({
      rank,
      taskId: task.id,
      taskTitle: task.title,
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color,
      reason,
      dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
      priority: task.priority,
      isOverdue: !!isOverdue,
      isBlocked: blocked,
    });

    rank++;
  }

  // Generate summary
  let summary = '';
  const overdueCount = suggestedOrder.filter((t) => t.isOverdue).length;
  const blockedCount = suggestedOrder.filter((t) => t.isBlocked).length;

  if (overdueCount > 0) {
    summary = `${overdueCount}件の期限切れタスクを優先的に対応してください。`;
  } else if (suggestedOrder.length > 0) {
    summary = `${suggestedOrder.length}件のタスクを優先順に並べました。上から順に取り組むことをお勧めします。`;
  } else {
    summary = '現在取り組むべきタスクはありません。';
  }

  if (blockedCount > 0) {
    summary += ` ${blockedCount}件のタスクはブロックされています。`;
  }

  if (availableHours) {
    summary += ` 本日${availableHours}時間で取り組める範囲を確認してください。`;
  }

  return {
    suggestedOrder,
    summary,
  };
};

// ============================================
// generate_daily_report - 日報生成
// ============================================

export interface GenerateDailyReportArgs {
  date?: string; // ISO date string, defaults to today
  includeNextDayPlan?: boolean;
}

export interface CompletedTaskEntry {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  completedAt: string;
}

export interface InProgressTaskEntry {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  progress: string;
}

export interface BlockedTaskEntry {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  blockedBy: string;
}

export interface NextDayTaskEntry {
  taskId: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  dueDate: string | null;
  priority: string | null;
}

export interface DailyReport {
  date: string;
  completedTasks: CompletedTaskEntry[];
  inProgressTasks: InProgressTaskEntry[];
  blockedTasks: BlockedTaskEntry[];
  nextDayPlan: NextDayTaskEntry[];
  summary: string;
  markdownReport: string;
}

export const generateDailyReportToolDefinition: AITool = {
  name: 'generate_daily_report',
  description:
    '日報を生成します。完了タスク、進行中タスク、ブロックされているタスク、翌日の予定をまとめます。',
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: '日報の対象日（ISO 8601形式: YYYY-MM-DD、省略時は今日）',
      },
      includeNextDayPlan: {
        type: 'boolean',
        description: '翌日の予定を含めるか（デフォルト: true）',
      },
    },
    required: [],
  },
};

export const generateDailyReportHandler: ToolHandler<
  GenerateDailyReportArgs,
  DailyReport
> = async (args, context) => {
  const { date, includeNextDayPlan = true } = args;
  const { userId, projectIds } = context as ToolExecutionContext;

  const now = new Date();
  const targetDate = date ? new Date(date) : now;
  const targetDateStr = targetDate.toISOString().split('T')[0];

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const completedTasks: CompletedTaskEntry[] = [];
  const inProgressTasks: InProgressTaskEntry[] = [];
  const blockedTasks: BlockedTaskEntry[] = [];
  const nextDayPlan: NextDayTaskEntry[] = [];

  if (!projectIds || projectIds.length === 0) {
    return {
      date: targetDateStr,
      completedTasks: [],
      inProgressTasks: [],
      blockedTasks: [],
      nextDayPlan: [],
      summary: 'プロジェクトがありません。',
      markdownReport: `# 日報 - ${targetDateStr}\n\nプロジェクトがありません。`,
    };
  }

  const projects = await getUserProjects(userId);
  const projectMap = new Map<string, Project>();
  projects.forEach((p) => projectMap.set(p.id, p));

  for (const projectId of projectIds) {
    const project = projectMap.get(projectId);
    if (!project) continue;

    const tasks = await getProjectTasks(projectId);
    const myTasks = tasks.filter((t) => t.assigneeIds.includes(userId));

    for (const task of myTasks) {
      // Completed today
      if (
        task.isCompleted &&
        task.completedAt &&
        task.completedAt >= startOfDay &&
        task.completedAt <= endOfDay
      ) {
        completedTasks.push({
          taskId: task.id,
          title: task.title,
          projectId: project.id,
          projectName: project.name,
          projectColor: project.color,
          completedAt: task.completedAt.toISOString(),
        });
      }

      // In progress (not completed, assigned to user)
      if (!task.isCompleted) {
        const blocked = isTaskBlocked(task, tasks);

        if (blocked) {
          // Find blocking tasks
          const blockingTasks = getDependencyTasks(task, tasks).filter(
            (t) => !t.isCompleted
          );
          const blockedByNames = blockingTasks.map((t) => t.title).join(', ');

          blockedTasks.push({
            taskId: task.id,
            title: task.title,
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            blockedBy: blockedByNames || '依存タスク未完了',
          });
        } else {
          // Determine progress
          let progress = '進行中';
          if (task.dueDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (task.dueDate < today) {
              const daysOverdue = Math.ceil(
                (today.getTime() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              progress = `期限超過（${daysOverdue}日）`;
            } else if (task.dueDate.getTime() === today.getTime()) {
              progress = '本日期限';
            }
          }
          if (task.priority === 'high') {
            progress += '・高優先度';
          }

          inProgressTasks.push({
            taskId: task.id,
            title: task.title,
            projectId: project.id,
            projectName: project.name,
            projectColor: project.color,
            progress,
          });
        }
      }
    }
  }

  // Next day plan - tasks with tomorrow's due date or high priority non-blocked tasks
  if (includeNextDayPlan) {
    const tomorrow = new Date(targetDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    // Get unblocked tasks for next day
    const nextDayCandidates = inProgressTasks
      .filter((t) => !blockedTasks.some((b) => b.taskId === t.taskId))
      .slice(0, 5);

    for (const entry of nextDayCandidates) {
      // Find original task to get priority/dueDate
      for (const projectId of projectIds) {
        const tasks = await getProjectTasks(projectId);
        const task = tasks.find((t) => t.id === entry.taskId);
        if (task) {
          nextDayPlan.push({
            taskId: task.id,
            title: task.title,
            projectId: entry.projectId,
            projectName: entry.projectName,
            projectColor: entry.projectColor,
            dueDate: task.dueDate ? task.dueDate.toISOString().split('T')[0] : null,
            priority: task.priority,
          });
          break;
        }
      }
    }
  }

  // Generate summary
  const totalCompleted = completedTasks.length;
  const totalInProgress = inProgressTasks.length;
  const totalBlocked = blockedTasks.length;

  let summary = `本日${totalCompleted}件のタスクを完了しました。`;
  if (totalInProgress > 0) {
    summary += ` 進行中のタスクは${totalInProgress}件です。`;
  }
  if (totalBlocked > 0) {
    summary += ` ${totalBlocked}件のタスクがブロックされています。`;
  }
  if (nextDayPlan.length > 0) {
    summary += ` 明日は${nextDayPlan.length}件のタスクに取り組む予定です。`;
  }

  // Generate markdown report
  let markdownReport = `# 日報 - ${targetDateStr}\n\n`;

  markdownReport += `## 完了したタスク（${completedTasks.length}件）\n`;
  if (completedTasks.length > 0) {
    for (const task of completedTasks) {
      markdownReport += `- [${task.projectName}] ${task.title}\n`;
    }
  } else {
    markdownReport += `- なし\n`;
  }
  markdownReport += '\n';

  markdownReport += `## 進行中のタスク（${inProgressTasks.length}件）\n`;
  if (inProgressTasks.length > 0) {
    for (const task of inProgressTasks) {
      markdownReport += `- [${task.projectName}] ${task.title}（${task.progress}）\n`;
    }
  } else {
    markdownReport += `- なし\n`;
  }
  markdownReport += '\n';

  if (blockedTasks.length > 0) {
    markdownReport += `## ブロックされているタスク（${blockedTasks.length}件）\n`;
    for (const task of blockedTasks) {
      markdownReport += `- [${task.projectName}] ${task.title}\n  - ブロック理由: ${task.blockedBy}\n`;
    }
    markdownReport += '\n';
  }

  if (includeNextDayPlan && nextDayPlan.length > 0) {
    markdownReport += `## 明日の予定（${nextDayPlan.length}件）\n`;
    for (const task of nextDayPlan) {
      let taskInfo = `- [${task.projectName}] ${task.title}`;
      if (task.priority) {
        taskInfo += `（${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}優先）`;
      }
      if (task.dueDate) {
        taskInfo += ` 期限: ${task.dueDate}`;
      }
      markdownReport += taskInfo + '\n';
    }
  }

  return {
    date: targetDateStr,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    nextDayPlan,
    summary,
    markdownReport,
  };
};
