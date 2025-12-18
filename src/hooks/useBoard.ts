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
      });
    },
    [projectId, state.lists]
  );

  // Update list
  const editList = useCallback(
    async (listId: string, data: { name?: string; color?: string }) => {
      if (!projectId) return;
      await updateList(projectId, listId, data);
    },
    [projectId]
  );

  // Delete list
  const removeList = useCallback(
    async (listId: string) => {
      if (!projectId) return;
      await deleteList(projectId, listId);
    },
    [projectId]
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
      await createTask(projectId, {
        listId,
        title,
        description: '',
        order: maxOrder + 1,
        assigneeIds: [],
        labelIds: [],
        tagIds: [],
        priority: null,
        startDate: null,
        dueDate: null,
        isCompleted: false,
        createdBy,
      });
    },
    [projectId, state.tasks]
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
      await updateTask(projectId, taskId, {
        listId: newListId,
        order: newOrder,
      });
    },
    [projectId]
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
  };
}
