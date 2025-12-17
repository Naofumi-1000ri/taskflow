'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, User, MessageSquare, Paperclip, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Task, Label, User as UserType } from '@/types';
import { isTaskOverdue } from '@/lib/utils/task';

interface TaskCardProps {
  task: Task;
  labels: Label[];
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ task, labels, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskLabels = labels.filter((label) => task.labelIds.includes(label.id));
  const isOverdue = isTaskOverdue(task);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      data-testid="task-card"
      className={cn(
        'cursor-pointer rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg',
        task.isCompleted && 'opacity-60'
      )}
    >
      {/* Labels */}
      {taskLabels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {taskLabels.map((label) => (
            <div
              key={label.id}
              className="h-2 w-8 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <p
        className={cn(
          'text-sm font-medium',
          task.isCompleted && 'line-through text-muted-foreground'
        )}
      >
        {task.title}
      </p>

      {/* Metadata */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {/* Due Date */}
        {task.dueDate && (
          <div
            className={cn(
              'flex items-center gap-1',
              isOverdue && !task.isCompleted && 'text-red-500'
            )}
          >
            <Calendar className="h-3 w-3" />
            <span>{format(task.dueDate, 'M/d', { locale: ja })}</span>
          </div>
        )}

        {/* Assignees */}
        {task.assigneeIds.length > 0 && (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>{task.assigneeIds.length}</span>
          </div>
        )}

        {/* Priority Badge */}
        {task.priority && (
          <Badge
            variant="outline"
            className={cn(
              'h-5 px-1 text-[10px]',
              task.priority === 'high' && 'border-red-300 bg-red-50 text-red-700',
              task.priority === 'medium' && 'border-yellow-300 bg-yellow-50 text-yellow-700',
              task.priority === 'low' && 'border-gray-300 bg-gray-50 text-gray-700'
            )}
          >
            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
          </Badge>
        )}
      </div>
    </div>
  );
}
