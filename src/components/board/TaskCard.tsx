'use client';

import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar, Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { getUsersByIds, getTaskAttachments, getProject } from '@/lib/firebase/firestore';
import { useNotifications } from '@/hooks/useNotifications';
import type { Task, Label, Tag, User as UserType, Attachment } from '@/types';
import { isTaskOverdue } from '@/lib/utils/task';

interface TaskCardProps {
  projectId: string;
  task: Task;
  labels: Label[];
  tags: Tag[];
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ projectId, task, labels, tags, onClick, isDragging }: TaskCardProps) {
  const [assignees, setAssignees] = useState<UserType[]>([]);
  const [imageAttachments, setImageAttachments] = useState<Attachment[]>([]);
  const [bellMessage, setBellMessage] = useState('');
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [isSendingBell, setIsSendingBell] = useState(false);
  const [projectName, setProjectName] = useState('');
  const { sendBellNotification } = useNotifications();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  // Fetch assignees
  useEffect(() => {
    let isMounted = true;
    if (task.assigneeIds.length === 0) {
      Promise.resolve().then(() => {
        if (isMounted) setAssignees([]);
      });
    } else {
      getUsersByIds(task.assigneeIds).then((users) => {
        if (isMounted) setAssignees(users);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [task.assigneeIds]);

  // Fetch image attachments
  useEffect(() => {
    if (projectId && task.id) {
      getTaskAttachments(projectId, task.id).then((attachments) => {
        // Filter only image attachments
        const images = attachments.filter((a) => a.type.startsWith('image/'));
        setImageAttachments(images);
      });
    }
  }, [projectId, task.id]);

  // Fetch project name for notifications
  useEffect(() => {
    if (projectId) {
      getProject(projectId).then((project) => {
        if (project) setProjectName(project.name);
      });
    }
  }, [projectId]);

  const handleSendBellNotification = async () => {
    if (!projectId || !task.id) return;

    setIsSendingBell(true);
    try {
      await sendBellNotification(
        projectId,
        projectName,
        task.id,
        task.title,
        bellMessage
      );
      setBellMessage('');
      setIsBellOpen(false);
    } catch (error) {
      console.error('Failed to send notification:', error);
    } finally {
      setIsSendingBell(false);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const taskLabels = labels.filter((label) => task.labelIds.includes(label.id));
  const taskTags = tags.filter((tag) => task.tagIds?.includes(tag.id));
  const isOverdue = isTaskOverdue(task);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      data-testid="task-card"
      className={cn(
        'group cursor-pointer rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg',
        task.isCompleted && 'opacity-60'
      )}
    >
      {/* Image Attachments - displayed at top like Jooto */}
      {imageAttachments.length > 0 && (
        <div className="relative">
          {imageAttachments.length === 1 ? (
            <img
              src={imageAttachments[0].url}
              alt={imageAttachments[0].name}
              className="h-32 w-full rounded-t-lg object-cover"
            />
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {imageAttachments.slice(0, 4).map((attachment, index) => (
                <div key={attachment.id} className="relative">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className={cn(
                      'h-16 w-full object-cover',
                      index === 0 && 'rounded-tl-lg',
                      index === 1 && 'rounded-tr-lg'
                    )}
                  />
                  {index === 3 && imageAttachments.length > 4 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-medium">
                      +{imageAttachments.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-3">
        {/* Labels */}
        {taskLabels.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {taskLabels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                className="h-5 px-1.5 text-[10px]"
                style={{
                  borderColor: label.color,
                  color: label.color,
                  backgroundColor: `${label.color}15`,
                }}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}

        {/* Title Row with Bell */}
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              'flex-1 text-sm font-medium',
              task.isCompleted && 'line-through text-muted-foreground'
            )}
          >
            {task.title}
          </p>
          <Popover open={isBellOpen} onOpenChange={setIsBellOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBellOpen(true);
                }}
                className="flex-shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
              >
                <Bell className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-64"
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-2">
                <p className="text-sm font-medium">メンバーに通知</p>
                <Input
                  value={bellMessage}
                  onChange={(e) => setBellMessage(e.target.value)}
                  placeholder="メッセージ（任意）"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      handleSendBellNotification();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleSendBellNotification}
                  disabled={isSendingBell}
                >
                  {isSendingBell ? '送信中...' : '通知を送信'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Description - truncated */}
        {task.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        )}

        {/* Assignees Row */}
        {assignees.length > 0 && (
          <div className="mt-2 flex -space-x-1.5">
            {assignees.slice(0, 4).map((assignee) => (
              <Avatar key={assignee.id} className="h-6 w-6 border-2 border-white">
                <AvatarImage src={assignee.photoURL || ''} alt={assignee.displayName} />
                <AvatarFallback className="text-[9px]">
                  {getInitials(assignee.displayName)}
                </AvatarFallback>
              </Avatar>
            ))}
            {assignees.length > 4 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-muted text-[9px] font-medium">
                +{assignees.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Metadata Row */}
        {(task.startDate || task.dueDate || task.priority) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {/* Date Range */}
            {(task.startDate || task.dueDate) && (
              <div
                className={cn(
                  'flex items-center gap-1',
                  isOverdue && !task.isCompleted && 'text-red-500'
                )}
              >
                <Calendar className="h-3 w-3" />
                <span>
                  {task.startDate && format(task.startDate, 'yyyy/MM/dd', { locale: ja })}
                  {task.startDate && task.dueDate && ' - '}
                  {task.dueDate && format(task.dueDate, 'yyyy/MM/dd', { locale: ja })}
                </span>
              </div>
            )}

            {/* Priority Badge */}
            {task.priority && (
              <Badge
                variant="outline"
                className={cn(
                  'h-5 px-1.5 text-[10px]',
                  task.priority === 'high' && 'border-red-300 bg-red-50 text-red-700',
                  task.priority === 'medium' && 'border-yellow-300 bg-yellow-50 text-yellow-700',
                  task.priority === 'low' && 'border-gray-300 bg-gray-50 text-gray-700'
                )}
              >
                {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
              </Badge>
            )}
          </div>
        )}

        {/* Tags - displayed at bottom like Jooto */}
        {taskTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {taskTags.map((tag) => (
              <Badge
                key={tag.id}
                className="h-5 px-2 text-[10px] text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
