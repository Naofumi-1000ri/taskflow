'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  createList,
  updateList,
  deleteList,
  getProjectLists,
  subscribeToProjectLists,
  createTask,
  updateTask,
  deleteTask,
  getProjectTasks,
  subscribeToProjectTasks,
  getProjectLabels,
  subscribeToProjectLabels,
  subscribeToProjectTags,
  getTaskChecklists,
  createChecklist,
} from '@/lib/firebase/firestore';
import type { List, Task, Label, Tag } from '@/types';

interface BoardState {
  lists: List[];
  tasks: Task[];
  labels: Label[];
  tags: Tag[];
  isLoading: boolean;
  error: Error | null;
}

export function useBoard(projectId: string | null) {
  const [state, setState] = useState<BoardState>({
    lists: [],
    tasks: [],
    labels: [],
    tags: [],
    isLoading: true,
    error: null,
  });

  // Subscribe to lists, tasks, and labels
  useEffect(() => {
    if (!projectId) {
      Promise.resolve().then(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
      });
      return;
    }

    Promise.resolve().then(() => {
      setState((prev) => ({ ...prev, isLoading: true }));
    });

    const unsubscribeLists = subscribeToProjectLists(projectId, (lists) => {
      setState((prev) => ({ ...prev, lists }));
    });

    const unsubscribeTasks = subscribeToProjectTasks(projectId, (tasks) => {
      setState((prev) => ({ ...prev, tasks, isLoading: false }));
    });

    const unsubscribeLabels = subscribeToProjectLabels(projectId, (labels) => {
      setState((prev) => ({ ...prev, labels }));
    });

    const unsubscribeTags = subscribeToProjectTags(projectId, (tags) => {
      setState((prev) => ({ ...prev, tags }));
    });

    return () => {
      unsubscribeLists();
      unsubscribeTasks();
      unsubscribeLabels();
      unsubscribeTags();
    };
  }, [projectId]);

  // Get tasks for a specific list
  const getTasksByListId = useCallback(
    (listId: string) => {
      return state.tasks
        .filter((task) => task.listId === listId)
        .sort((a, b) => a.order - b.order);
    },
    [state.tasks]
  );

  // Create list
  const addList = useCallback(
    async (name: string, color: string) => {
      if (!projectId) return;
      const maxOrder = Math.max(...state.lists.map((l) => l.order), -1);
      await createList(projectId, {
        name,
        color,
        order: maxOrder + 1,
        autoCompleteOnEnter: false,
        autoUncompleteOnExit: false,
      });
    },
    [projectId, state.lists]
  );

  // Update list
  const editList = useCallback(
    async (listId: string, data: { name?: string; color?: string; autoCompleteOnEnter?: boolean; autoUncompleteOnExit?: boolean }) => {
      if (!projectId) return;
      await updateList(projectId, listId, data);
    },
    [projectId]
  );

  // Delete list (move tasks to target list first)
  const removeList = useCallback(
    async (listId: string, targetListId?: string) => {
      if (!projectId) return;

      // Get tasks in the list to be deleted
      const tasksToMove = state.tasks.filter((t) => t.listId === listId);
      const oldList = state.lists.find((l) => l.id === listId);
      const targetList = targetListId ? state.lists.find((l) => l.id === targetListId) : null;

      if (tasksToMove.length > 0 && targetListId) {
        // Get max order in target list
        const targetTasks = state.tasks.filter((t) => t.listId === targetListId);
        let maxOrder = Math.max(...targetTasks.map((t) => t.order), -1);

        // Move all tasks to target list with auto-complete logic
        const moveUpdates = tasksToMove.map((task) => {
          maxOrder += 1;
          const updateData: Partial<Task> = {
            listId: targetListId,
            order: maxOrder,
          };

          // Apply auto-complete logic
          if (targetList?.autoCompleteOnEnter && !task.isCompleted) {
            updateData.isCompleted = true;
            updateData.completedAt = new Date();
          } else if (oldList?.autoUncompleteOnExit && task.isCompleted) {
            updateData.isCompleted = false;
            updateData.completedAt = null;
          }

          return updateTask(projectId, task.id, updateData);
        });
        await Promise.all(moveUpdates);
      }

      // Delete the list
      await deleteList(projectId, listId);
    },
    [projectId, state.tasks, state.lists]
  );

  // Reorder lists
  const reorderLists = useCallback(
    async (reorderedLists: List[]) => {
      if (!projectId) return;
      const updates = reorderedLists.map((list, index) =>
        updateList(projectId, list.id, { order: index })
      );
      await Promise.all(updates);
    },
    [projectId]
  );

  // Create task
  const addTask = useCallback(
    async (listId: string, title: string, createdBy: string) => {
      if (!projectId) return;
      const tasksInList = state.tasks.filter((t) => t.listId === listId);
      const maxOrder = Math.max(...tasksInList.map((t) => t.order), -1);

      // Check if the target list has auto-complete enabled
      const targetList = state.lists.find((l) => l.id === listId);
      const shouldAutoComplete = targetList?.autoCompleteOnEnter ?? false;

      await createTask(projectId, {
        listId,
        title,
        description: '',
        order: maxOrder + 1,
        assigneeIds: [],
        labelIds: [],
        tagIds: [],
        dependsOnTaskIds: [],
        priority: null,
        startDate: null,
        dueDate: null,
        durationDays: null,
        isDueDateFixed: false,
        isCompleted: shouldAutoComplete,
        completedAt: shouldAutoComplete ? new Date() : null,
        isAbandoned: false,
        createdBy,
      });
    },
    [projectId, state.tasks, state.lists]
  );

  // Update task
  const editTask = useCallback(
    async (
      taskId: string,
      data: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>
    ) => {
      if (!projectId) return;
      await updateTask(projectId, taskId, data);
    },
    [projectId]
  );

  // Delete task
  const removeTask = useCallback(
    async (taskId: string) => {
      if (!projectId) return;
      await deleteTask(projectId, taskId);
    },
    [projectId]
  );

  // Move task to different list
  const moveTask = useCallback(
    async (taskId: string, newListId: string, newOrder: number) => {
      if (!projectId) return;

      // Find the task and lists
      const task = state.tasks.find((t) => t.id === taskId);
      const oldList = task ? state.lists.find((l) => l.id === task.listId) : null;
      const newList = state.lists.find((l) => l.id === newListId);

      // Prepare update data
      const updateData: Partial<Task> = {
        listId: newListId,
        order: newOrder,
      };

      // Only apply auto-complete logic when moving to a different list
      if (task && task.listId !== newListId) {
        // Check if new list auto-completes tasks
        if (newList?.autoCompleteOnEnter && !task.isCompleted) {
          updateData.isCompleted = true;
          updateData.completedAt = new Date();
        }
        // Check if old list auto-uncompletes tasks on exit
        else if (oldList?.autoUncompleteOnExit && task.isCompleted) {
          updateData.isCompleted = false;
          updateData.completedAt = null;
        }
      }

      await updateTask(projectId, taskId, updateData);
    },
    [projectId, state.tasks, state.lists]
  );

  // Reorder tasks within a list
  const reorderTasks = useCallback(
    async (listId: string, taskIds: string[]) => {
      if (!projectId) return;
      const updates = taskIds.map((taskId, index) =>
        updateTask(projectId, taskId, { order: index })
      );
      await Promise.all(updates);
    },
    [projectId]
  );

  // Duplicate task
  const duplicateTask = useCallback(
    async (taskId: string, createdBy: string): Promise<string | null> => {
      if (!projectId) return null;

      // Find the original task
      const originalTask = state.tasks.find((t) => t.id === taskId);
      if (!originalTask) return null;

      // Calculate new order (add at end of list)
      const tasksInList = state.tasks.filter((t) => t.listId === originalTask.listId);
      const maxOrder = Math.max(...tasksInList.map((t) => t.order), -1);

      // Create the duplicated task
      const newTaskId = await createTask(projectId, {
        listId: originalTask.listId,
        title: `コピー - ${originalTask.title}`,
        description: originalTask.description,
        order: maxOrder + 1,
        assigneeIds: [...originalTask.assigneeIds],
        labelIds: [...originalTask.labelIds],
        tagIds: [...originalTask.tagIds],
        dependsOnTaskIds: [], // Don't copy dependencies
        priority: originalTask.priority,
        startDate: originalTask.startDate,
        dueDate: originalTask.dueDate,
        durationDays: originalTask.durationDays,
        isDueDateFixed: originalTask.isDueDateFixed,
        isCompleted: false, // New task starts as incomplete
        completedAt: null,
        isAbandoned: false,
        createdBy,
      });

      // Copy checklists with items unchecked
      try {
        const checklists = await getTaskChecklists(projectId, taskId);
        for (const checklist of checklists) {
          await createChecklist(projectId, newTaskId, {
            title: checklist.title,
            order: checklist.order,
            items: checklist.items.map((item) => ({
              ...item,
              isChecked: false, // Uncheck all items
            })),
          });
        }
      } catch (error) {
        console.error('Failed to copy checklists:', error);
      }

      return newTaskId;
    },
    [projectId, state.tasks]
  );

  return {
    lists: state.lists,
    tasks: state.tasks,
    labels: state.labels,
    tags: state.tags,
    isLoading: state.isLoading,
    error: state.error,
    getTasksByListId,
    addList,
    editList,
    removeList,
    reorderLists,
    addTask,
    editTask,
    removeTask,
    moveTask,
    reorderTasks,
    duplicateTask,
  };
}
