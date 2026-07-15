'use client';

import Image from 'next/image';
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
  listName: string;
  listColor: string;
  labels: Label[];
  tags: Tag[];
  allTasks?: Task[]; // For dependency lookup
  onClick: () => void;
  isDragging?: boolean;
}

export function TaskCard({ projectId, task, listName, listColor, labels, tags, allTasks, onClick, isDragging }: TaskCardProps) {
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

  const hasDateRail = Boolean(task.startDate || task.dueDate);
  const hasHoverDetails = Boolean(
    task.description ||
    taskLabels.length > 0 ||
    taskTags.length > 0 ||
    task.completedAt ||
    hasDateRail ||
    task.durationDays ||
    hasDependencies ||
    isDeadlineOverdue ||
    predictedDates
  );

  const renderRailDate = (date: Date) => {
    const text = format(date, 'M/d', { locale: ja });

    return (
      <time
        dateTime={format(date, 'yyyy-MM-dd')}
        className={cn(
          'whitespace-nowrap font-bold leading-none tracking-[-0.04em]',
          text.length >= 5 ? 'text-[17px]' : 'text-[20px]'
        )}
      >
        {text}
      </time>
    );
  };

  const card = (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      data-testid="task-card"
      className={cn(
        'group cursor-pointer overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md',
        (isDragging || isSortableDragging) && 'opacity-50 shadow-lg',
        isDeadlineOverdue && 'border-red-500 border-2 bg-red-50'
      )}
    >
      {/* Image Attachments - displayed at top like Jooto */}
      {imageAttachments.length > 0 && (
        <div className="relative">
          {imageAttachments.length === 1 ? (
            <div className="relative h-32 w-full overflow-hidden rounded-t-lg">
              <Image
                src={imageAttachments[0].url}
                alt={imageAttachments[0].name}
                fill
                sizes="(max-width: 768px) 100vw, 384px"
                className="object-cover"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-0.5">
              {imageAttachments.slice(0, 4).map((attachment, index) => (
                <div key={attachment.id} className="relative h-16">
                  <Image
                    src={attachment.url}
                    alt={attachment.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 192px"
                    className={cn(
                      'object-cover',
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

      <div className="flex">
        {hasDateRail && (
          <aside
            data-testid="task-card-date-rail"
            className={cn(
              'flex w-14 shrink-0 flex-col items-center justify-center gap-2 border-r border-blue-200 bg-blue-50 px-1.5 py-3 text-slate-950',
              isOverdue && 'border-red-200 bg-red-50 text-red-700'
            )}
          >
            {task.startDate && renderRailDate(task.startDate)}
            {task.startDate && task.dueDate && (
              <span className="text-[20px] font-bold leading-none tracking-[-0.04em]" aria-hidden="true">
                〜
              </span>
            )}
            {task.dueDate && renderRailDate(task.dueDate)}
          </aside>
        )}

        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-start gap-2">
            <p className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold leading-5 text-slate-950">
              {task.title}
            </p>
            <Popover open={isBellOpen} onOpenChange={setIsBellOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="メンバーに通知"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsBellOpen(true);
                  }}
                  className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
                >
                  <Bell className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="z-50 w-64 border bg-background shadow-lg"
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

          <div className="mt-2 flex min-h-6 items-center justify-between gap-2">
            <div className="flex -space-x-1.5">
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

            <div className="flex min-w-0 items-center justify-end gap-1">
              {task.priority && (
                <Badge
                  variant="outline"
                  className={cn(
                    'h-5 shrink-0 px-1.5 text-[10px]',
                    task.priority === 'high' && 'border-red-300 bg-red-50 text-red-700',
                    task.priority === 'medium' && 'border-yellow-300 bg-yellow-50 text-yellow-700',
                    task.priority === 'low' && 'border-gray-300 bg-gray-50 text-gray-700'
                  )}
                >
                  {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="h-5 max-w-[92px] shrink px-1.5 text-[9px] font-semibold"
                style={{
                  borderColor: listColor,
                  color: listColor,
                  backgroundColor: `${listColor}18`,
                }}
              >
                <span className="truncate">{listName}</span>
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!hasHoverDetails || isDragging || isSortableDragging) {
    return card;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{card}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} className="w-72 max-w-[calc(100vw-2rem)] space-y-2 px-3 py-2.5 text-left text-xs text-balance">
        <p className="font-semibold">詳細</p>

        {task.description && <p className="whitespace-pre-wrap text-background/85">{task.description}</p>}

        {(taskLabels.length > 0 || taskTags.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {taskLabels.map((label) => (
              <Badge
                key={label.id}
                className="h-5 px-1.5 text-[10px] text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name}
              </Badge>
            ))}
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

        <div className="space-y-1 text-background/85">
          {hasDateRail && (
            <p className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                {task.startDate && format(task.startDate, 'yyyy年M月d日', { locale: ja })}
                {task.startDate && task.dueDate && ' 〜 '}
                {task.dueDate && format(task.dueDate, 'yyyy年M月d日', { locale: ja })}
              </span>
            </p>
          )}
          {task.isCompleted && task.completedAt && (
            <p className="flex items-center gap-1 text-green-300">
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              <span>完了: {format(task.completedAt, 'yyyy年M月d日', { locale: ja })}</span>
            </p>
          )}
          {task.durationDays && (
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              <span>必要期間: {task.durationDays}日</span>
            </p>
          )}
          {isDeadlineOverdue && (
            <p className="flex items-center gap-1 text-red-300">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>依存タスクの遅延により期限超過</span>
            </p>
          )}
          {predictedDates && !task.startDate && !task.dueDate && (
            <p className="flex items-center gap-1 text-amber-200">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>
                予測: {format(predictedDates.start, 'M/d', { locale: ja })}〜{format(predictedDates.end, 'M/d', { locale: ja })}
              </span>
            </p>
          )}
        </div>

        {hasDependencies && (
          <div className="space-y-1 border-t border-background/20 pt-2 text-background/85">
            <p className="flex items-center gap-1 font-medium text-background">
              <Link2 className="h-3 w-3" />依存タスク
            </p>
            {dependentTasks.map((dep) => (
              <p key={dep.id} className="flex items-center gap-1 pl-4">
                {dep.isCompleted ? (
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-green-300" />
                ) : (
                  <span className="h-3 w-3 shrink-0 rounded-full border border-background/50" />
                )}
                <span className={cn('truncate', dep.isCompleted && 'line-through opacity-70')}>
                  {dep.title}
                </span>
              </p>
            ))}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
