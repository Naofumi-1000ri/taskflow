'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useProjects } from './useProjects';
import { subscribeToProjectTasks } from '@/lib/firebase/firestore';
import type { Task, Project } from '@/types';

export interface MyTask extends Task {
  projectName: string;
  projectColor: string;
  projectIcon: string;
  projectIconUrl?: string;
}

export function useMyTasks() {
  const { user } = useAuthStore();
  const { projects, isLoading: projectsLoading } = useProjects();
  const [tasksByProject, setTasksByProject] = useState<Map<string, Task[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to tasks for each project
  useEffect(() => {
    if (projectsLoading || !user?.id) {
      return;
    }

    if (projects.length === 0) {
      setTasksByProject(new Map());
      setIsLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    let loadedCount = 0;

    projects.forEach((project) => {
      const unsubscribe = subscribeToProjectTasks(project.id, (tasks) => {
        setTasksByProject((prev) => {
          const newMap = new Map(prev);
          newMap.set(project.id, tasks);
          return newMap;
        });

        loadedCount++;
        if (loadedCount >= projects.length) {
          setIsLoading(false);
        }
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [projects, projectsLoading, user?.id]);

  // Filter and sort tasks
  const myTasks = useMemo(() => {
    if (!user?.id) return [];

    const projectMap = new Map<string, Project>();
    projects.forEach((p) => projectMap.set(p.id, p));

    const allTasks: MyTask[] = [];

    tasksByProject.forEach((tasks, projectId) => {
      const project = projectMap.get(projectId);
      if (!project) return;

      tasks.forEach((task) => {
        // Filter: assigned to me AND not completed
        if (task.assigneeIds.includes(user.id) && !task.isCompleted) {
          allTasks.push({
            ...task,
            projectName: project.name,
            projectColor: project.color,
            projectIcon: project.icon,
            projectIconUrl: project.iconUrl,
          });
        }
      });
    });

    // Sort by due date (overdue first, then upcoming, then no date)
    return allTasks.sort((a, b) => {
      // Both have no due date
      if (!a.dueDate && !b.dueDate) return 0;
      // a has no due date, put at end
      if (!a.dueDate) return 1;
      // b has no due date, put at end
      if (!b.dueDate) return -1;
      // Sort by date
      return a.dueDate.getTime() - b.dueDate.getTime();
    });
  }, [tasksByProject, projects, user?.id]);

  return {
    tasks: myTasks,
    isLoading: isLoading || projectsLoading,
    taskCount: myTasks.length,
  };
}
