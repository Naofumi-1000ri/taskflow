'use client';

import { useState, useCallback } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { BoardView } from '@/components/board/BoardView';
import { BoardFilterBar, type BoardFilters } from '@/components/board/BoardFilterBar';
import { ProjectUrlsBar } from '@/components/board/ProjectUrlsBar';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { useBoard } from '@/hooks/useBoard';
import { useProject } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/authStore';
import type { ProjectUrl } from '@/types';

export default function BoardPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;
  const { user } = useAuthStore();
  const { lists, tasks, labels, editTask, removeTask, duplicateTask } = useBoard(projectId);
  const { project, update: updateProject } = useProject(projectId);
  const selectedTaskId = searchParams.get('task');

  const [filters, setFilters] = useState<BoardFilters>({
    keyword: '',
    labelIds: new Set(),
    dueFilter: 'all',
    showCompleted: true,
  });

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) || null
    : null;

  const syncTaskQuery = useCallback(
    (taskId: string | null) => {
      const nextParams = new URLSearchParams(searchParams.toString());

      if (taskId) {
        nextParams.set('task', taskId);
      } else {
        nextParams.delete('task');
      }

      const nextQuery = nextParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const handleTaskClick = useCallback((taskId: string) => {
    syncTaskQuery(taskId);
  }, [syncTaskQuery]);

  const handleCloseModal = useCallback(() => {
    syncTaskQuery(null);
  }, [syncTaskQuery]);

  const handleUpdateTask = useCallback(
    (data: Parameters<typeof editTask>[1]) => {
      if (selectedTask) {
        editTask(selectedTask.id, data);
      }
    },
    [selectedTask, editTask]
  );

  const handleDeleteTask = useCallback(() => {
    if (selectedTask) {
      removeTask(selectedTask.id);
      syncTaskQuery(null);
    }
  }, [selectedTask, removeTask, syncTaskQuery]);

  const handleDuplicateTask = useCallback(async () => {
    if (selectedTask && user) {
      const newTaskId = await duplicateTask(selectedTask.id, user.id);
      if (newTaskId) {
        syncTaskQuery(newTaskId);
      }
    }
  }, [selectedTask, user, duplicateTask, syncTaskQuery]);

  // URL handlers
  const handleAddUrl = useCallback(
    async (url: ProjectUrl) => {
      const currentUrls = project?.urls || [];
      await updateProject({ urls: [...currentUrls, url] });
    },
    [project?.urls, updateProject]
  );

  const handleEditUrl = useCallback(
    async (urlId: string, data: Partial<ProjectUrl>) => {
      const currentUrls = project?.urls || [];
      const updatedUrls = currentUrls.map((u) =>
        u.id === urlId ? { ...u, ...data } : u
      );
      await updateProject({ urls: updatedUrls });
    },
    [project?.urls, updateProject]
  );

  const handleRemoveUrl = useCallback(
    async (urlId: string) => {
      const currentUrls = project?.urls || [];
      const updatedUrls = currentUrls.filter((u) => u.id !== urlId);
      await updateProject({ urls: updatedUrls });
    },
    [project?.urls, updateProject]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-shrink-0">
        <ProjectUrlsBar
          urls={project?.urls || []}
          onAddUrl={handleAddUrl}
          onEditUrl={handleEditUrl}
          onRemoveUrl={handleRemoveUrl}
        />
      </div>
      <div className="flex-shrink-0">
        <BoardFilterBar
          filters={filters}
          labels={labels}
          onFiltersChange={setFilters}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <BoardView projectId={projectId} onTaskClick={handleTaskClick} filters={filters} />
      </div>
      <TaskDetailModal
        task={selectedTask}
        projectId={projectId}
        lists={lists}
        labels={labels}
        allTasks={tasks}
        isOpen={!!selectedTask}
        onClose={handleCloseModal}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onDuplicate={handleDuplicateTask}
      />
    </div>
  );
}
