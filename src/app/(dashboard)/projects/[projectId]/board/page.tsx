'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
  const projectId = params.projectId as string;
  const { user } = useAuthStore();
  const { lists, tasks, labels, editTask, removeTask, duplicateTask } = useBoard(projectId);
  const { project, update: updateProject } = useProject(projectId);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [filters, setFilters] = useState<BoardFilters>({
    keyword: '',
    labelIds: new Set(),
    dueFilter: 'all',
    showCompleted: true,
  });

  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) || null
    : null;

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  const handleUpdateTask = useCallback(
    (data: Parameters<typeof editTask>[1]) => {
      if (selectedTaskId) {
        editTask(selectedTaskId, data);
      }
    },
    [selectedTaskId, editTask]
  );

  const handleDeleteTask = useCallback(() => {
    if (selectedTaskId) {
      removeTask(selectedTaskId);
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, removeTask]);

  const handleDuplicateTask = useCallback(async () => {
    if (selectedTaskId && user) {
      const newTaskId = await duplicateTask(selectedTaskId, user.id);
      if (newTaskId) {
        setSelectedTaskId(newTaskId); // Open the new task
      }
    }
  }, [selectedTaskId, user, duplicateTask]);

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
        isOpen={!!selectedTaskId}
        onClose={handleCloseModal}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
        onDuplicate={handleDuplicateTask}
      />
    </div>
  );
}
