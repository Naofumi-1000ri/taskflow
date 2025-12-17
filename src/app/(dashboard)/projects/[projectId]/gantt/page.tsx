'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GanttChart } from '@/components/gantt';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { useBoard } from '@/hooks/useBoard';

export default function GanttPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { lists, tasks, labels, editTask, removeTask } = useBoard(projectId);

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

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <GanttChart
        tasks={tasks}
        lists={lists}
        labels={labels}
        onTaskClick={handleTaskClick}
      />
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
