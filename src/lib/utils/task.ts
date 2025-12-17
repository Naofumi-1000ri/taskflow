import type { Task, Priority, ChecklistItem } from '@/types';

const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/**
 * Sort tasks by due date in ascending order.
 * Tasks without due date are placed at the end.
 */
export function sortTasksByDueDate(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });
}

/**
 * Sort tasks by priority (high > medium > low).
 * Tasks without priority are placed at the end.
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.priority && !b.priority) return 0;
    if (!a.priority) return 1;
    if (!b.priority) return -1;
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });
}

/**
 * Sort tasks by order in ascending order.
 */
export function sortTasksByOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.order - b.order);
}

/**
 * Filter tasks that have the specified label.
 */
export function filterTasksByLabel(tasks: Task[], labelId: string): Task[] {
  return tasks.filter((task) => task.labelIds.includes(labelId));
}

/**
 * Filter tasks assigned to the specified user.
 */
export function filterTasksByAssignee(tasks: Task[], userId: string): Task[] {
  return tasks.filter((task) => task.assigneeIds.includes(userId));
}

/**
 * Filter tasks that are overdue (past due date and not completed).
 */
export function filterOverdueTasks(tasks: Task[], now: Date = new Date()): Task[] {
  return tasks.filter((task) => {
    if (!task.dueDate || task.isCompleted) return false;
    return task.dueDate.getTime() < now.getTime();
  });
}

/**
 * Filter tasks due within the specified number of days.
 * Does not include overdue tasks or tasks without due date.
 */
export function filterTasksDueSoon(
  tasks: Task[],
  days: number,
  now: Date = new Date()
): Task[] {
  const futureDate = new Date(now);
  futureDate.setDate(futureDate.getDate() + days);

  return tasks.filter((task) => {
    if (!task.dueDate || task.isCompleted) return false;
    const dueTime = task.dueDate.getTime();
    return dueTime >= now.getTime() && dueTime <= futureDate.getTime();
  });
}

/**
 * Calculate progress from checklist items.
 */
export function getTaskProgress(items: ChecklistItem[]): {
  completed: number;
  total: number;
  percentage: number;
} {
  if (items.length === 0) {
    return { completed: 0, total: 0, percentage: 0 };
  }

  const completed = items.filter((item) => item.isChecked).length;
  const total = items.length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

/**
 * Check if a task is overdue.
 */
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.dueDate || task.isCompleted) return false;
  return task.dueDate.getTime() < now.getTime();
}
