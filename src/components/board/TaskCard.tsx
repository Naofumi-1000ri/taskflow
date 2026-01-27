'use client';

import { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertTriangle, Calendar, Bell, CheckCircle2, Clock, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getUsersByIds, getTaskAttachments, getProject } from '@/lib/firebase/firestore';
import { useNotifications } from '@/hooks/useNotifications';
import type { Task, Label, Tag, User as UserType, Attachment } from '@/types';
import { isTaskOverdue, getEffectiveDates } from '@/lib/utils/task';

interface TaskCardProps {
  projectId: string;
  task: Task;
  labels: Label[];
  tags: Tag[];
  allTasks?: Task[]; // For dependency lookup
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ projectId, task, labels, tags, allTasks, onClick, isDragging }: TaskCardProps) {
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
        bellMessage,
        task.assigneeIds
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

  // Calculate dependency info
  const dependentTasks = allTasks
    ? task.dependsOnTaskIds
        .map((id) => allTasks.find((t) => t.id === id))
        .filter((t): t is Task => t !== undefined)
    : [];

  // Get effective dates using shared helper
  const effectiveDates = allTasks ? getEffectiveDates(task, allTasks) : null;
  const predictedDates = effectiveDates?.isPredicted && effectiveDates.predictedStart && effectiveDates.predictedEnd
    ? { start: effectiveDates.predictedStart, end: effectiveDates.predictedEnd }
    : null;
  const isDeadlineOverdue = effectiveDates?.isDeadlineOverdue ?? false;
  const hasDependencies = dependentTasks.length > 0;

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
        isDeadlineOverdue && 'border-red-500 border-2 bg-red-50'
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
          <p className="flex-1 text-sm font-medium">
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
              className="w-64 bg-background border shadow-lg z-50"
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
        {(task.startDate || task.dueDate || task.priority || task.completedAt) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {/* Completion Date - shown when completed */}
            {task.isCompleted && task.completedAt && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-green-600 cursor-default">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>完了: {format(task.completedAt, 'M/d', { locale: ja })}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{format(task.completedAt, 'yyyy年M月d日', { locale: ja })}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Date Range - not shown as overdue if completed */}
            {!task.isCompleted && (task.startDate || task.dueDate) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'flex items-center gap-1 cursor-default',
                        isOverdue && 'text-red-500'
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>
                        {task.startDate && format(task.startDate, 'M/d', { locale: ja })}
                        {task.startDate && task.dueDate && ' - '}
                        {task.dueDate && format(task.dueDate, 'M/d', { locale: ja })}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {task.startDate && format(task.startDate, 'yyyy年M月d日', { locale: ja })}
                      {task.startDate && task.dueDate && ' 〜 '}
                      {task.dueDate && format(task.dueDate, 'yyyy年M月d日', { locale: ja })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

        {/* Dependencies and Duration Row */}
        {(hasDependencies || task.durationDays || isDeadlineOverdue) && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {/* Deadline Overdue Warning */}
            {isDeadlineOverdue && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-red-600 font-medium cursor-default">
                      <AlertTriangle className="h-3 w-3" />
                      <span>期限超過</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>依存タスクの遅延により、開始日が期限を超過しています</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Duration Badge */}
            {task.durationDays && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-blue-600 cursor-default">
                      <Clock className="h-3 w-3" />
                      <span>{task.durationDays}日間</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>必要期間: {task.durationDays}日</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Dependencies */}
            {hasDependencies && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-purple-600 cursor-default">
                      <Link2 className="h-3 w-3" />
                      <span className="truncate max-w-[100px]">
                        {dependentTasks[0].title}
                        {dependentTasks.length > 1 && ` 他${dependentTasks.length - 1}件`}
                        後
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">依存タスク:</p>
                      {dependentTasks.map((dep) => (
                        <p key={dep.id} className="flex items-center gap-1">
                          {dep.isCompleted ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <span className="h-3 w-3 rounded-full border border-gray-300" />
                          )}
                          <span className={dep.isCompleted ? 'line-through text-muted-foreground' : ''}>
                            {dep.title}
                          </span>
                        </p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Predicted Dates */}
            {predictedDates && !task.startDate && !task.dueDate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 text-amber-600 cursor-default">
                      <Calendar className="h-3 w-3" />
                      <span>
                        予測: {format(predictedDates.start, 'M/d', { locale: ja })}〜{format(predictedDates.end, 'M/d', { locale: ja })}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      依存タスク完了後の予測日程:
                      <br />
                      {format(predictedDates.start, 'yyyy年M月d日', { locale: ja })} 〜 {format(predictedDates.end, 'yyyy年M月d日', { locale: ja })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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
