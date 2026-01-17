'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { GanttChart } from '@/components/gantt';
import { TaskDetailModal } from '@/components/task/TaskDetailModal';
import { useBoard } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/authStore';

export default function GanttPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuthStore();
  const { lists, tasks, labels, editTask, removeTask, duplicateTask } = useBoard(projectId);

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

  const handleDuplicateTask = useCallback(async () => {
    if (selectedTaskId && user) {
      const newTaskId = await duplicateTask(selectedTaskId, user.id);
      if (newTaskId) {
        setSelectedTaskId(newTaskId);
      }
    }
  }, [selectedTaskId, user, duplicateTask]);

  // Handler for Gantt chart drag updates
  const handleGanttTaskUpdate = useCallback(
    (taskId: string, data: Parameters<typeof editTask>[1]) => {
      editTask(taskId, data);
    },
    [editTask]
  );

  return (
    <div className="flex flex-col">
      <GanttChart
        tasks={tasks}
        lists={lists}
        labels={labels}
        onTaskClick={handleTaskClick}
        onTaskUpdate={handleGanttTaskUpdate}
      />
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
