'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { getProjectTasks } from '@/lib/firebase/firestore';
import type { Project, Task } from '@/types';

export interface SearchResult {
  type: 'project' | 'task';
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  projectIcon: string;
  projectColor: string;
  // Task-specific fields
  isCompleted?: boolean;
  priority?: string | null;
  listId?: string;
}

interface UseGlobalSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  results: SearchResult[];
  isSearching: boolean;
  projectResults: SearchResult[];
  taskResults: SearchResult[];
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const { projects } = useProjects();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const taskCacheRef = useRef<Map<string, Task[]>>(new Map());
  const abortRef = useRef(0);

  // Fetch tasks for all projects on first search
  const fetchAllTasks = useCallback(async (signal: number): Promise<Map<string, Task[]>> => {
    const cache = taskCacheRef.current;
    const unfetched = projects.filter((p) => !cache.has(p.id));

    if (unfetched.length === 0) return cache;

    const results = await Promise.allSettled(
      unfetched.map(async (project) => {
        const tasks = await getProjectTasks(project.id);
        return { projectId: project.id, tasks };
      })
    );

    // Check if search was cancelled
    if (signal !== abortRef.current) return cache;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        cache.set(result.value.projectId, result.value.tasks);
      }
    }

    return cache;
  }, [projects]);

  useEffect(() => {
    const trimmed = query.trim().toLowerCase();

    if (!trimmed) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const signal = ++abortRef.current;
    setIsSearching(true);

    // Build project map for quick lookup
    const projectMap = new Map<string, Project>();
    for (const p of projects) {
      projectMap.set(p.id, p);
    }

    // Immediately filter projects
    const projectResults: SearchResult[] = projects
      .filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.description.toLowerCase().includes(trimmed)
      )
      .map((p) => ({
        type: 'project' as const,
        id: p.id,
        title: p.name,
        description: p.description,
        projectId: p.id,
        projectName: p.name,
        projectIcon: p.icon,
        projectColor: p.color,
      }));

    // Fetch and filter tasks
    fetchAllTasks(signal).then((cache) => {
      if (signal !== abortRef.current) return;

      const taskResults: SearchResult[] = [];

      for (const [projectId, tasks] of cache) {
        const project = projectMap.get(projectId);
        if (!project) continue;

        for (const task of tasks) {
          if (
            task.title.toLowerCase().includes(trimmed) ||
            task.description.toLowerCase().includes(trimmed)
          ) {
            taskResults.push({
              type: 'task',
              id: task.id,
              title: task.title,
              description: task.description,
              projectId: task.projectId,
              projectName: project.name,
              projectIcon: project.icon,
              projectColor: project.color,
              isCompleted: task.isCompleted,
              priority: task.priority,
              listId: task.listId,
            });
          }
        }
      }

      // Sort: incomplete tasks first, then by title
      taskResults.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return a.title.localeCompare(b.title);
      });

      setResults([...projectResults, ...taskResults]);
      setIsSearching(false);
    });

    // Set project-only results immediately while tasks load
    setResults(projectResults);
  }, [query, projects, fetchAllTasks]);

  // Clear cache when projects change
  useEffect(() => {
    taskCacheRef.current.clear();
  }, [projects]);

  const projectResults = results.filter((r) => r.type === 'project');
  const taskResults = results.filter((r) => r.type === 'task');

  return {
    query,
    setQuery,
    results,
    isSearching,
    projectResults,
    taskResults,
  };
}
