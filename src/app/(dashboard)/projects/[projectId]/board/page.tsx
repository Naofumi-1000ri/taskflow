'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { BoardView } from '@/components/board/BoardView';
import { ProjectUrlsBar } from '@/components/board/ProjectUrlsBar';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { useBoard } from '@/hooks/useBoard';
import { useProject } from '@/hooks/useProjects';
import type { ProjectUrl } from '@/types';

export default function BoardPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { lists, tasks, labels, editTask, removeTask } = useBoard(projectId);
  const { project, update: updateProject } = useProject(projectId);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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
    <div className="flex h-full min-h-0 flex-col">
      <ProjectUrlsBar
        urls={project?.urls || []}
        onAddUrl={handleAddUrl}
        onEditUrl={handleEditUrl}
        onRemoveUrl={handleRemoveUrl}
      />
      <div className="min-h-0 flex-1">
        <BoardView projectId={projectId} onTaskClick={handleTaskClick} />
      </div>
      <TaskDetailModal
        task={selectedTask}
        projectId={projectId}
        lists={lists}
        labels={labels}
        isOpen={!!selectedTaskId}
        onClose={handleCloseModal}
        onUpdate={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
