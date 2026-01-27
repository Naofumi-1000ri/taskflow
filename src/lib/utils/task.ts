import { addDays, differenceInDays } from 'date-fns';
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

/**
 * Calculate the effective start date based on task dependencies.
 *
 * Logic:
 * - If all dependency tasks are completed: returns the latest completedAt date
 * - If some dependency tasks are not completed: returns the latest dueDate
 * - If no dependencies: returns null
 *
 * @param task The task to calculate the effective start date for
 * @param allTasks All tasks in the project (to look up dependencies)
 * @returns The effective start date, or null if no dependencies
 */
export function calculateEffectiveStartDate(
  task: Task,
  allTasks: Task[]
): Date | null {
  if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
    return null;
  }

  const dependencyTasks = allTasks.filter((t) =>
    task.dependsOnTaskIds.includes(t.id)
  );

  if (dependencyTasks.length === 0) {
    return null;
  }

  const allCompleted = dependencyTasks.every((t) => t.isCompleted);

  if (allCompleted) {
    // All dependencies are completed - use the latest completedAt date
    const completedDates = dependencyTasks
      .map((t) => t.completedAt)
      .filter((d): d is Date => d !== null);

    if (completedDates.length === 0) {
      return null;
    }

    return new Date(Math.max(...completedDates.map((d) => d.getTime())));
  } else {
    // Some dependencies are not completed - use the latest dueDate
    const dueDates = dependencyTasks
      .map((t) => t.dueDate)
      .filter((d): d is Date => d !== null);

    if (dueDates.length === 0) {
      return null;
    }

    return new Date(Math.max(...dueDates.map((d) => d.getTime())));
  }
}

/**
 * Check if adding a dependency would create a circular reference.
 *
 * @param taskId The task that would have the new dependency
 * @param newDependencyId The task ID to add as a dependency
 * @param allTasks All tasks in the project
 * @returns true if adding this dependency would create a circular reference
 */
export function hasCircularDependency(
  taskId: string,
  newDependencyId: string,
  allTasks: Task[]
): boolean {
  // A task cannot depend on itself
  if (taskId === newDependencyId) {
    return true;
  }

  // Use DFS to check if newDependencyId eventually depends on taskId
  const visited = new Set<string>();
  const stack = [newDependencyId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;

    if (currentId === taskId) {
      return true; // Found circular dependency
    }

    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    const currentTask = allTasks.find((t) => t.id === currentId);
    if (currentTask && currentTask.dependsOnTaskIds) {
      stack.push(...currentTask.dependsOnTaskIds);
    }
  }

  return false;
}

/**
 * Get all dependency tasks for a given task.
 *
 * @param task The task to get dependencies for
 * @param allTasks All tasks in the project
 * @returns Array of dependency tasks
 */
export function getDependencyTasks(task: Task, allTasks: Task[]): Task[] {
  if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
    return [];
  }

  return allTasks.filter((t) => task.dependsOnTaskIds.includes(t.id));
}

/**
 * Get all tasks that depend on a given task (reverse dependency lookup).
 *
 * @param taskId The task ID to find dependents for
 * @param allTasks All tasks in the project
 * @returns Array of tasks that depend on the given task
 */
export function getDependentTasks(taskId: string, allTasks: Task[]): Task[] {
  return allTasks.filter(
    (t) => t.dependsOnTaskIds && t.dependsOnTaskIds.includes(taskId)
  );
}

/**
 * Get all tasks that depend on a given task, recursively (entire dependency chain).
 *
 * @param taskId The task ID to find dependents for
 * @param allTasks All tasks in the project
 * @returns Array of all tasks in the dependency chain
 */
export function getAllDependentTasks(taskId: string, allTasks: Task[]): Task[] {
  const result: Task[] = [];
  const visited = new Set<string>();
  const queue = [taskId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const dependents = getDependentTasks(currentId, allTasks);
    for (const dep of dependents) {
      if (!visited.has(dep.id)) {
        result.push(dep);
        queue.push(dep.id);
      }
    }
  }

  return result;
}

/**
 * Check if a task is blocked (has incomplete dependencies).
 *
 * @param task The task to check
 * @param allTasks All tasks in the project
 * @returns true if the task has incomplete dependencies
 */
export function isTaskBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
    return false;
  }

  const dependencyTasks = getDependencyTasks(task, allTasks);
  return dependencyTasks.some((t) => !t.isCompleted);
}

/**
 * Get the bottleneck task (the dependency causing the latest start date).
 *
 * @param task The task to find the bottleneck for
 * @param allTasks All tasks in the project
 * @returns The task causing the latest delay, or null if no dependencies
 */
export function getBottleneckTask(task: Task, allTasks: Task[]): Task | null {
  if (!task.dependsOnTaskIds || task.dependsOnTaskIds.length === 0) {
    return null;
  }

  const dependencyTasks = allTasks.filter((t) =>
    task.dependsOnTaskIds.includes(t.id)
  );

  if (dependencyTasks.length === 0) return null;

  const allCompleted = dependencyTasks.every((t) => t.isCompleted);

  if (allCompleted) {
    // All completed - find the one with the latest completedAt
    return dependencyTasks.reduce((latest, t) => {
      if (!t.completedAt) return latest;
      if (!latest || !latest.completedAt) return t;
      return t.completedAt > latest.completedAt ? t : latest;
    }, null as Task | null);
  } else {
    // Some incomplete - find the incomplete one with the latest dueDate
    const incompleteTasks = dependencyTasks.filter((t) => !t.isCompleted);
    return incompleteTasks.reduce((latest, t) => {
      if (!t.dueDate) return latest;
      if (!latest || !latest.dueDate) return t;
      return t.dueDate > latest.dueDate ? t : latest;
    }, null as Task | null);
  }
}

/**
 * Effective dates interface including predicted dates from dependencies.
 */
export interface EffectiveDates {
  startDate: Date | null;       // Actual/explicit start date
  dueDate: Date | null;         // Actual/explicit due date
  predictedStart: Date | null;  // Predicted start date from dependencies
  predictedEnd: Date | null;    // Predicted end date (predictedStart + durationDays)
  isPredicted: boolean;         // Whether dates are predicted (no explicit dates set)
  isDeadlineOverdue: boolean;   // Dependency pushes start past fixed due date
}

/**
 * Calculate effective dates for a task including predictions based on dependencies.
 *
 * @param task The task to calculate dates for
 * @param allTasks All tasks in the project (for dependency lookups)
 * @returns EffectiveDates with actual and/or predicted dates
 */
export function getEffectiveDates(task: Task, allTasks: Task[]): EffectiveDates {
  const result: EffectiveDates = {
    startDate: task.startDate,
    dueDate: task.dueDate,
    predictedStart: null,
    predictedEnd: null,
    isPredicted: false,
    isDeadlineOverdue: false,
  };

  // If task has explicit dates, check if dependency overrides them
  const effectiveStart = calculateEffectiveStartDate(task, allTasks);

  if (effectiveStart) {
    // Check if we need to use predicted dates
    if (!task.startDate && !task.dueDate && task.durationDays) {
      // No explicit dates, but has duration + dependencies -> predict
      result.predictedStart = effectiveStart;
      result.predictedEnd = addDays(effectiveStart, task.durationDays - 1);
      result.isPredicted = true;
    } else if (task.startDate && effectiveStart > task.startDate) {
      // Dependency pushes start date forward
      result.predictedStart = effectiveStart;

      if (task.durationDays && !task.isDueDateFixed) {
        // Duration優先: recalculate end date
        result.predictedEnd = addDays(effectiveStart, task.durationDays - 1);
      } else if (task.dueDate) {
        // Fixed due date: keep original
        result.predictedEnd = task.dueDate;
      }

      result.isPredicted = true;

      // Check for deadline overdue (dependency pushes start past fixed due date)
      if (task.isDueDateFixed && task.dueDate && effectiveStart > task.dueDate) {
        result.isDeadlineOverdue = true;
      }
    }
  } else if (!task.startDate && !task.dueDate && task.durationDays && task.dependsOnTaskIds?.length > 0) {
    // Has dependencies but couldn't calculate effective start (deps have no dates)
    // This case will show as "pending" in the gantt chart
  }

  return result;
}

/**
 * Recalculate dates based on isDueDateFixed flag and input changes.
 *
 * @param task The current task state
 * @param changes The changes being applied
 * @returns Updated date values
 */
export function recalculateDates(
  task: Task,
  changes: {
    startDate?: Date | null;
    dueDate?: Date | null;
    durationDays?: number | null;
    isDueDateFixed?: boolean;
  }
): {
  startDate: Date | null;
  dueDate: Date | null;
  durationDays: number | null;
  isDueDateFixed: boolean;
} {
  const startDate = changes.startDate !== undefined ? changes.startDate : task.startDate;
  let dueDate = changes.dueDate !== undefined ? changes.dueDate : task.dueDate;
  let durationDays = changes.durationDays !== undefined ? changes.durationDays : task.durationDays;
  let isDueDateFixed = changes.isDueDateFixed !== undefined ? changes.isDueDateFixed : task.isDueDateFixed;

  // If due date was explicitly changed, mark as fixed
  if (changes.dueDate !== undefined && changes.dueDate !== null) {
    isDueDateFixed = true;
    // Recalculate duration if we have start date
    if (startDate) {
      durationDays = differenceInDays(changes.dueDate, startDate) + 1;
    }
  }

  // If duration was explicitly changed, mark as not fixed and recalculate due date
  if (changes.durationDays !== undefined && changes.durationDays !== null) {
    isDueDateFixed = false;
    if (startDate) {
      dueDate = addDays(startDate, changes.durationDays - 1);
    }
  }

  // If start date changed and not fixed, recalculate due date
  if (changes.startDate !== undefined && changes.startDate !== null && !isDueDateFixed && durationDays) {
    dueDate = addDays(changes.startDate, durationDays - 1);
  }

  // If start date changed and fixed, recalculate duration
  if (changes.startDate !== undefined && changes.startDate !== null && isDueDateFixed && dueDate) {
    durationDays = differenceInDays(dueDate, changes.startDate) + 1;
  }

  return {
    startDate,
    dueDate,
    durationDays,
    isDueDateFixed,
  };
}
