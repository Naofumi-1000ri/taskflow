'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Bookmark,
  ListChecks,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Star,
  Flag,
  Plus,
  Check,
  Paperclip,
  FileIcon,
  Image as ImageIcon,
  CheckCircle2,
  Circle,
  Pencil,
  Bell,
  Link2,
  AlertCircle,
  Lock,
  Copy,
} from 'lucide-react';
import { formatFileSize, getFileIcon } from '@/lib/firebase/storage';
import { cn, linkifyText } from '@/lib/utils';
import {
  calculateEffectiveStartDate,
  hasCircularDependency,
  getDependencyTasks,
  isTaskBlocked,
  getBottleneckTask,
} from '@/lib/utils/task';
import { useTaskDetails } from '@/hooks/useTaskDetails';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { getProject, getProjectTags, createTag, getUsersByIds } from '@/lib/firebase/firestore';
import { AssigneeSelector } from './AssigneeSelector';
import { AttachmentPreview, AttachmentPreviewCompact } from './AttachmentPreview';
import type { Task, Label as LabelType, Tag as TagType, List, Priority, Checklist } from '@/types';
import { TAG_COLORS } from '@/types';

interface TaskDetailModalProps {
  task: Task | null;
  projectId: string;
  lists: List[];
  labels: LabelType[];
  allTasks: Task[]; // All tasks in the project for dependency selection
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Task>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

export function TaskDetailModal({
  task,
  projectId,
  lists,
  labels,
  allTasks,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onDuplicate,
}: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const { sendBellNotification } = useNotifications();
  const {
    checklists,
    comments,
    addChecklist,
    removeChecklist,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    addComment,
    removeComment,
    editComment,
    getAllCommentAttachments,
  } = useTaskDetails(projectId, task?.id || null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listId, setListId] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | undefined>();
  const [commentText, setCommentText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
  const [projectTags, setProjectTags] = useState<TagType[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Record<string, { displayName: string; photoURL?: string }>>({});
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(TAG_COLORS[0].value);
  const [projectName, setProjectName] = useState('');
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [bellMessage, setBellMessage] = useState('');
  const [isSendingBell, setIsSendingBell] = useState(false);

  // Fetch project members and name
  useEffect(() => {
    if (projectId) {
      getProject(projectId).then((project) => {
        if (project) {
          setProjectMemberIds(project.memberIds);
          setProjectName(project.name);
        }
      });
    }
  }, [projectId]);

  // Fetch project tags
  useEffect(() => {
    if (projectId) {
      getProjectTags(projectId).then(setProjectTags);
    }
  }, [projectId]);

  // Fetch comment authors
  useEffect(() => {
    const authorIds = [...new Set(comments.map(c => c.authorId))];
    if (authorIds.length > 0) {
      getUsersByIds(authorIds).then((users) => {
        const authorsMap: Record<string, { displayName: string; photoURL?: string }> = {};
        users.forEach((u) => {
          authorsMap[u.id] = { displayName: u.displayName, photoURL: u.photoURL || undefined };
        });
        setCommentAuthors(authorsMap);
      });
    }
  }, [comments]);

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      Promise.resolve().then(() => {
        setTitle(task.title);
        setDescription(task.description || '');
        setListId(task.listId);
        setPriority(task.priority);
        setDueDate(task.dueDate || undefined);
        setStartDate(task.startDate || undefined);
        setSelectedLabelIds(task.labelIds);
        setIsCompleted(task.isCompleted);
        setCompletedAt(task.completedAt || undefined);
        setCommentText(''); // Reset comment when task changes
        setPendingFiles([]);
      });
    }
  }, [task]);

  // Expand all checklists by default
  useEffect(() => {
    if (checklists.length > 0) {
      Promise.resolve().then(() => {
        setExpandedChecklists(new Set(checklists.map(c => c.id)));
      });
    }
  }, [checklists]);

  const handleSave = () => {
    onUpdate({
      title,
      description,
      listId,
      priority,
      dueDate: dueDate || null,
      startDate: startDate || null,
      labelIds: selectedLabelIds,
      isCompleted,
      completedAt: completedAt || null,
    });
  };

  const handleSendBellNotification = async () => {
    if (!projectId || !task?.id) return;

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

  // Toggle completion with automatic completedAt handling
  const handleToggleComplete = () => {
    const newIsCompleted = !isCompleted;
    const newCompletedAt = newIsCompleted ? new Date() : undefined;
    setIsCompleted(newIsCompleted);
    setCompletedAt(newCompletedAt);
    onUpdate({
      isCompleted: newIsCompleted,
      completedAt: newCompletedAt || null,
    });
  };

  const handleAssigneeUpdate = (newAssigneeIds: string[]) => {
    onUpdate({ assigneeIds: newAssigneeIds });
  };

  const handleLabelToggle = (labelId: string) => {
    const newLabelIds = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    setSelectedLabelIds(newLabelIds);
    onUpdate({ labelIds: newLabelIds });
  };

  const handleTagToggle = (tagId: string) => {
    const currentTagIds = task?.tagIds || [];
    const newTagIds = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    onUpdate({ tagIds: newTagIds });
  };

  const handleCreateTag = async () => {
    if (newTagName.trim() && projectId) {
      const tagId = await createTag(projectId, {
        name: newTagName.trim(),
        color: newTagColor,
        order: projectTags.length,
      });
      // Refresh tags
      const updatedTags = await getProjectTags(projectId);
      setProjectTags(updatedTags);
      // Add the new tag to the task
      const currentTagIds = task?.tagIds || [];
      onUpdate({ tagIds: [...currentTagIds, tagId] });
      // Reset form
      setNewTagName('');
      setNewTagColor(TAG_COLORS[0].value);
      setIsAddingTag(false);
    }
  };

  const handleAddComment = async () => {
    if (user && (commentText.trim() || pendingFiles.length > 0)) {
      setIsSubmittingComment(true);
      try {
        await addComment(commentText.trim(), user.id, [], pendingFiles);
        setCommentText('');
        setPendingFiles([]);
      } catch (error) {
        console.error('Failed to add comment:', error);
        alert(error instanceof Error ? error.message : 'コメントの投稿に失敗しました');
      } finally {
        setIsSubmittingComment(false);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setPendingFiles((prev) => [...prev, ...Array.from(files)]);
    }
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // ファイル名を生成（タイムスタンプ付き）
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const extension = file.type.split('/')[1] || 'png';
          const namedFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
            type: file.type,
          });
          imageFiles.push(namedFile);
        }
      }
    }

    if (imageFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...imageFiles]);
    }
  };

  // Get all comment attachments for Jooto-style display at task top
  const commentAttachments = getAllCommentAttachments();

  const toggleChecklistExpanded = (checklistId: string) => {
    setExpandedChecklists(prev => {
      const next = new Set(prev);
      if (next.has(checklistId)) {
        next.delete(checklistId);
      } else {
        next.add(checklistId);
      }
      return next;
    });
  };

  const getChecklistProgress = (checklist: Checklist) => {
    if (checklist.items.length === 0) return 0;
    const completed = checklist.items.filter(item => item.isChecked).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  const currentList = lists.find((l) => l.id === listId);

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden p-0">
        <div className="flex h-full max-h-[90vh] flex-col">
          {/* Header */}
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {currentList && (
                  <>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: currentList.color }}
                    />
                    <span>{currentList.name}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Popover open={isBellOpen} onOpenChange={setIsBellOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 bg-background border shadow-lg" align="end">
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
            </div>
            <DialogTitle className="mt-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className={cn(
                  'border-none p-0 text-xl font-bold shadow-none focus-visible:ring-0 break-all',
                  isCompleted && 'line-through text-muted-foreground'
                )}
              />
            </DialogTitle>
            <button
              onClick={() => setDescription(description || '')}
              className="mt-1 text-left text-sm text-muted-foreground hover:text-foreground"
            >
              {description ? '説明を編集' : '説明を追加'}
            </button>
          </DialogHeader>

          {/* Content */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 px-6 py-4">
              {/* Comment Attachments (Jooto-style at top) */}
              {commentAttachments.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Paperclip className="h-4 w-4" />
                    添付ファイル ({commentAttachments.length})
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {commentAttachments.map(({ attachment }) => (
                      <AttachmentPreview
                        key={attachment.id}
                        id={attachment.id}
                        name={attachment.name}
                        url={attachment.url}
                        type={attachment.type}
                        size={attachment.size}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description (if editing) */}
              {description !== undefined && (
                <div className="mb-4">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSave}
                    placeholder="タスクの詳細を入力..."
                    rows={3}
                    className="resize-none break-all"
                  />
                </div>
              )}

              {/* Metadata Row */}
              <div className="space-y-3">
                {/* Completion Status */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <button
                    onClick={handleToggleComplete}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>
                  <div className="flex flex-1 items-center gap-2">
                    <button
                      onClick={handleToggleComplete}
                      className={cn(
                        'hover:text-foreground',
                        isCompleted ? 'font-medium text-green-600' : 'text-muted-foreground'
                      )}
                    >
                      {isCompleted ? '完了' : '未完了'}
                    </button>
                    {isCompleted && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-1 rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {completedAt ? format(completedAt, 'M/d', { locale: ja }) : format(new Date(), 'M/d', { locale: ja })}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-4" align="start">
                          <div className="space-y-2">
                            <p className="text-sm font-medium">完了日</p>
                            <Calendar
                              mode="single"
                              selected={completedAt || new Date()}
                              onSelect={(date) => {
                                if (date) {
                                  setCompletedAt(date);
                                  onUpdate({ completedAt: date });
                                }
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>

                {/* Start Date */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  {task?.dependsOnTaskIds && task.dependsOnTaskIds.length > 0 ? (
                    // 依存タスクあり: ロック表示
                    <div className="flex flex-1 items-center gap-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span>
                          開始: {(() => {
                            const date = calculateEffectiveStartDate(task, allTasks);
                            return date ? format(date, 'M/d', { locale: ja }) : '未定';
                          })()}
                        </span>
                        <Lock className="h-3 w-3" />
                      </div>
                      {/* ボトルネックタスク表示 */}
                      {(() => {
                        const bottleneck = getBottleneckTask(task, allTasks);
                        if (bottleneck) {
                          return (
                            <span className="ml-auto max-w-[150px] truncate text-xs text-amber-600">
                              ← {bottleneck.title}
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  ) : (
                    // 依存タスクなし: 編集可能
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                          {startDate ? (
                            <span>開始: {format(startDate, 'M/d', { locale: ja })}</span>
                          ) : (
                            '開始日を設定'
                          )}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date);
                            onUpdate({ startDate: date || null });
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        {dueDate ? (
                          <span>期限: {format(dueDate, 'M/d', { locale: ja })}</span>
                        ) : (
                          '期限を設定'
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={(date) => {
                          setDueDate(date);
                          onUpdate({ dueDate: date || null });
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Dependencies */}
                <div className="flex items-start gap-3 py-2 text-sm">
                  <Link2 className="mt-0.5 h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 space-y-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                          依存タスク: {task?.dependsOnTaskIds?.length || 0}件
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-3">
                          <p className="text-sm font-medium">依存タスク（このタスクの前に完了が必要）</p>
                          <ScrollArea className="max-h-60">
                            <div className="space-y-1">
                              {allTasks
                                .filter((t) => t.id !== task?.id) // Exclude current task
                                .sort((a, b) => {
                                  // Sort by list order, then by order within list
                                  const listA = lists.find((l) => l.id === a.listId);
                                  const listB = lists.find((l) => l.id === b.listId);
                                  const listOrderA = listA?.order ?? 0;
                                  const listOrderB = listB?.order ?? 0;
                                  if (listOrderA !== listOrderB) return listOrderA - listOrderB;
                                  return a.order - b.order;
                                })
                                .map((t) => {
                                  const isSelected = task?.dependsOnTaskIds?.includes(t.id);
                                  const wouldCreateCircular = !isSelected && task && hasCircularDependency(task.id, t.id, allTasks);
                                  const taskList = lists.find((l) => l.id === t.listId);

                                  return (
                                    <button
                                      key={t.id}
                                      onClick={() => {
                                        if (wouldCreateCircular) return;
                                        const currentDeps = task?.dependsOnTaskIds || [];
                                        const newDeps = isSelected
                                          ? currentDeps.filter((id) => id !== t.id)
                                          : [...currentDeps, t.id];

                                        // Calculate new effective start date based on dependencies
                                        const tempTask = { ...task!, dependsOnTaskIds: newDeps };
                                        const effectiveStartDate = calculateEffectiveStartDate(tempTask, allTasks);

                                        // Update both dependencies and start date
                                        const updateData: Partial<Task> = { dependsOnTaskIds: newDeps };
                                        if (effectiveStartDate) {
                                          updateData.startDate = effectiveStartDate;
                                        } else if (newDeps.length === 0) {
                                          // If removing all dependencies, keep the current startDate (don't reset it)
                                        }
                                        onUpdate(updateData);
                                      }}
                                      disabled={wouldCreateCircular}
                                      className={cn(
                                        'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors',
                                        isSelected && 'bg-muted',
                                        wouldCreateCircular
                                          ? 'cursor-not-allowed opacity-50'
                                          : 'hover:bg-muted'
                                      )}
                                    >
                                      <div
                                        className="h-2 w-2 flex-shrink-0 rounded-full"
                                        style={{ backgroundColor: taskList?.color || '#6b7280' }}
                                      />
                                      <span className={cn(
                                        'flex-1 truncate text-left',
                                        t.isCompleted && 'line-through text-muted-foreground'
                                      )}>
                                        {t.title}
                                      </span>
                                      {t.isCompleted ? (
                                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                                      ) : t.dueDate ? (
                                        <span className="flex-shrink-0 text-xs text-muted-foreground">
                                          〜{format(t.dueDate, 'M/d', { locale: ja })}
                                        </span>
                                      ) : null}
                                      {isSelected && (
                                        <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                                      )}
                                      {wouldCreateCircular && (
                                        <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          </ScrollArea>
                          {allTasks.filter((t) => t.id !== task?.id).length === 0 && (
                            <p className="text-xs text-muted-foreground">他にタスクがありません</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>

                    {/* Selected dependencies display */}
                    {task?.dependsOnTaskIds && task.dependsOnTaskIds.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {getDependencyTasks(task, allTasks).map((depTask) => {
                          const taskList = lists.find((l) => l.id === depTask.listId);
                          return (
                            <Badge
                              key={depTask.id}
                              variant="outline"
                              className={cn(
                                'flex items-center gap-1',
                                depTask.isCompleted && 'bg-green-50 border-green-200'
                              )}
                            >
                              <div
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: taskList?.color || '#6b7280' }}
                              />
                              <span className={cn(
                                'max-w-[100px] truncate',
                                depTask.isCompleted && 'line-through'
                              )}>
                                {depTask.title}
                              </span>
                              {depTask.isCompleted ? (
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                              ) : depTask.dueDate ? (
                                <span className="text-xs text-muted-foreground">
                                  〜{format(depTask.dueDate, 'M/d', { locale: ja })}
                                </span>
                              ) : null}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newDeps = task.dependsOnTaskIds.filter((id) => id !== depTask.id);

                                  // Calculate new effective start date based on remaining dependencies
                                  const tempTask = { ...task, dependsOnTaskIds: newDeps };
                                  const effectiveStartDate = calculateEffectiveStartDate(tempTask, allTasks);

                                  // Update both dependencies and start date
                                  const updateData: Partial<Task> = { dependsOnTaskIds: newDeps };
                                  if (effectiveStartDate) {
                                    updateData.startDate = effectiveStartDate;
                                  }
                                  onUpdate(updateData);
                                }}
                                className="ml-0.5 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* Effective start date display */}
                    {task && (() => {
                      const effectiveDate = calculateEffectiveStartDate(task, allTasks);
                      const blocked = isTaskBlocked(task, allTasks);
                      if (effectiveDate) {
                        return (
                          <p className={cn(
                            'text-xs',
                            blocked ? 'text-amber-600' : 'text-green-600'
                          )}>
                            {blocked ? (
                              <>開始可能日: {format(effectiveDate, 'M/d', { locale: ja })}（依存タスク未完了）</>
                            ) : (
                              <>開始可能日: {format(effectiveDate, 'M/d', { locale: ja })}（依存タスク完了済み）</>
                            )}
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* Assignee */}
                <AssigneeSelector
                  assigneeIds={task.assigneeIds}
                  projectMemberIds={projectMemberIds}
                  onUpdate={handleAssigneeUpdate}
                />

                {/* Labels */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <TagIcon className="h-5 w-5 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-2">
                        {selectedLabelIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedLabelIds.map((labelId) => {
                              const label = labels.find((l) => l.id === labelId);
                              if (!label) return null;
                              return (
                                <Badge
                                  key={label.id}
                                  variant="outline"
                                  style={{
                                    borderColor: label.color,
                                    color: label.color,
                                    backgroundColor: `${label.color}10`,
                                  }}
                                >
                                  {label.name}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">ラベル: 指定なし</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="start">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">ラベルを選択</p>
                        {labels.map((label) => (
                          <button
                            key={label.id}
                            onClick={() => handleLabelToggle(label.id)}
                            className={cn(
                              'flex w-full items-center gap-2 rounded px-2 py-1 text-sm transition-colors hover:bg-muted',
                              selectedLabelIds.includes(label.id) && 'bg-muted'
                            )}
                          >
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: label.color }}
                            />
                            <span>{label.name}</span>
                            {selectedLabelIds.includes(label.id) && (
                              <span className="ml-auto text-primary">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Tags (Status Tags) */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <Bookmark className="h-5 w-5 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="flex items-center gap-2">
                        {(task?.tagIds?.length || 0) > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {task?.tagIds?.map((tagId) => {
                              const tag = projectTags.find((t) => t.id === tagId);
                              if (!tag) return null;
                              return (
                                <Badge
                                  key={tag.id}
                                  className="text-white"
                                  style={{ backgroundColor: tag.color }}
                                >
                                  {tag.name}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">タグ: 指定なし</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="start">
                      <div className="space-y-3">
                        <p className="text-sm font-medium">タグを選択</p>
                        <div className="space-y-1">
                          {projectTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleTagToggle(tag.id)}
                              className={cn(
                                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors hover:bg-muted',
                                task?.tagIds?.includes(tag.id) && 'bg-muted'
                              )}
                            >
                              <Badge
                                className="text-white text-xs"
                                style={{ backgroundColor: tag.color }}
                              >
                                {tag.name}
                              </Badge>
                              {task?.tagIds?.includes(tag.id) && (
                                <Check className="ml-auto h-4 w-4 text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                        <Separator />
                        {isAddingTag ? (
                          <div className="space-y-2">
                            <Input
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="タグ名を入力..."
                              className="h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.nativeEvent.isComposing) return;
                                if (e.key === 'Enter') handleCreateTag();
                                if (e.key === 'Escape') {
                                  setIsAddingTag(false);
                                  setNewTagName('');
                                }
                              }}
                            />
                            <div className="flex flex-wrap gap-1">
                              {TAG_COLORS.map((color) => (
                                <button
                                  key={color.value}
                                  onClick={() => setNewTagColor(color.value)}
                                  className={cn(
                                    'h-5 w-5 rounded transition-transform hover:scale-110',
                                    newTagColor === color.value && 'ring-2 ring-offset-1 ring-primary'
                                  )}
                                  style={{ backgroundColor: color.value }}
                                />
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleCreateTag}>
                                作成
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setIsAddingTag(false);
                                  setNewTagName('');
                                }}
                              >
                                キャンセル
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsAddingTag(true)}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Plus className="h-4 w-4" />
                            新しいタグを作成
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Priority */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <Flag className="h-5 w-5 text-muted-foreground" />
                  <Select
                    value={priority || 'none'}
                    onValueChange={(value) => {
                      const newPriority = value === 'none' ? null : (value as Priority);
                      setPriority(newPriority);
                      onUpdate({ priority: newPriority });
                    }}
                  >
                    <SelectTrigger className="h-auto w-auto border-none p-0 shadow-none">
                      <SelectValue placeholder="優先度: なし" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">優先度: なし</SelectItem>
                      <SelectItem value="high">
                        <span className="text-red-600">優先度: 高</span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span className="text-yellow-600">優先度: 中</span>
                      </SelectItem>
                      <SelectItem value="low">
                        <span className="text-gray-600">優先度: 低</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Add Checklist */}
                <button
                  onClick={() => addChecklist('チェックリスト')}
                  className="flex items-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <ListChecks className="h-5 w-5" />
                  <span>チェックリストの新規作成</span>
                </button>
              </div>

              {/* Checklists */}
              {checklists.length > 0 && (
                <div className="mt-6 space-y-4">
                  {checklists.map((checklist) => (
                    <ChecklistCard
                      key={checklist.id}
                      checklist={checklist}
                      isExpanded={expandedChecklists.has(checklist.id)}
                      onToggleExpand={() => toggleChecklistExpanded(checklist.id)}
                      onDelete={() => removeChecklist(checklist.id)}
                      onAddItem={(text) => addChecklistItem(checklist.id, text)}
                      onToggleItem={(itemId) => toggleChecklistItem(checklist.id, itemId)}
                      onDeleteItem={(itemId) => removeChecklistItem(checklist.id, itemId)}
                      progress={getChecklistProgress(checklist)}
                    />
                  ))}
                </div>
              )}

              {/* Comments Section */}
              <div className="mt-6">
                <Separator className="mb-4" />

                {/* Comment List */}
                {comments.length > 0 && (
                  <div className="mb-4 space-y-3">
                    {comments.map((comment) => {
                      const author = commentAuthors[comment.authorId];
                      const authorName = author?.displayName || 'Unknown';
                      const authorInitials = authorName.slice(0, 2).toUpperCase();
                      const isEditing = editingCommentId === comment.id;
                      const isEdited = comment.updatedAt && comment.updatedAt.getTime() !== comment.createdAt.getTime();
                      return (
                        <div key={comment.id} className="group flex gap-3">
                          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-medium overflow-hidden">
                            {author?.photoURL ? (
                              <img src={author.photoURL} alt={authorName} className="h-full w-full object-cover" />
                            ) : (
                              authorInitials
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{authorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(comment.createdAt, 'M/d HH:mm', { locale: ja })}
                                {isEdited && ' (編集済み)'}
                              </span>
                              {!isEditing && (
                                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingCommentId(comment.id);
                                      setEditingCommentText(comment.content);
                                    }}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('このコメントを削除しますか？')) {
                                        removeComment(comment.id);
                                      }
                                    }}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            {isEditing ? (
                              <div className="rounded-lg border p-2">
                                <Textarea
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  rows={3}
                                  className="resize-none break-all border-none p-0 shadow-none focus-visible:ring-0"
                                  autoFocus
                                />
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      if (editingCommentText.trim()) {
                                        await editComment(comment.id, editingCommentText.trim());
                                        setEditingCommentId(null);
                                        setEditingCommentText('');
                                      }
                                    }}
                                  >
                                    保存
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditingCommentText('');
                                    }}
                                  >
                                    キャンセル
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg bg-muted p-3">
                                {comment.content && (
                                  <p className="break-all whitespace-pre-wrap text-sm">{linkifyText(comment.content)}</p>
                                )}
                                {/* Comment Attachments */}
                                {comment.attachments && comment.attachments.length > 0 && (
                                  <div className={cn("flex flex-wrap gap-2", comment.content && "mt-2")}>
                                    {comment.attachments.map((att) => (
                                      <AttachmentPreviewCompact
                                        key={att.id}
                                        id={att.id}
                                        name={att.name}
                                        url={att.url}
                                        type={att.type}
                                        size={att.size}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Comment Input */}
                <div className="rounded-lg border p-3">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onPaste={handlePaste}
                    placeholder="コメントを書く（画像は貼り付け可能）"
                    rows={3}
                    className="resize-none break-all border-none p-0 shadow-none focus-visible:ring-0"
                  />
                  {/* Pending Files Preview */}
                  {pendingFiles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {/* Image previews - large thumbnails */}
                      {pendingFiles.filter(f => f.type.startsWith('image/')).length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                          {pendingFiles.map((file, index) => {
                            if (!file.type.startsWith('image/')) return null;
                            return (
                              <div key={index} className="relative group">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt={file.name}
                                  className="w-full max-h-40 rounded-lg object-cover border"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePendingFile(index)}
                                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Non-image files - badge style */}
                      {pendingFiles.filter(f => !f.type.startsWith('image/')).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {pendingFiles.map((file, index) => {
                            if (file.type.startsWith('image/')) return null;
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-1 rounded border bg-muted px-2 py-1 text-xs"
                              >
                                <FileIcon className="h-3 w-3" />
                                <span className="max-w-[100px] truncate">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removePendingFile(index)}
                                  className="ml-1 text-muted-foreground hover:text-foreground"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex flex-shrink-0 items-center justify-between">
                    <label className="cursor-pointer text-muted-foreground hover:text-foreground">
                      <Paperclip className="h-4 w-4" />
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={(!commentText.trim() && pendingFiles.length === 0) || isSubmittingComment}
                    >
                      {isSubmittingComment ? 'アップロード中...' : 'コメントを投稿'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-6 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                タスク作成: {task.createdAt ? format(task.createdAt, 'yyyy年M月d日 HH:mm', { locale: ja }) : '-'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onDuplicate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDuplicate}
                  className="h-8"
                  title="タスクを複製"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('このタスクを削除しますか？')) {
                    onDelete();
                  }
                }}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Checklist Card Component
interface ChecklistCardProps {
  checklist: Checklist;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onAddItem: (text: string) => void;
  onToggleItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  progress: number;
}

function ChecklistCard({
  checklist,
  isExpanded,
  onToggleExpand,
  onDelete,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  progress,
}: ChecklistCardProps) {
  const [newItemText, setNewItemText] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAddItem(newItemText.trim());
      setNewItemText('');
    }
  };

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-1">
          <h4 className="font-medium">{checklist.title}</h4>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-primary">{progress}%</span>
            <Progress value={progress} className="h-1.5 flex-1" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleExpand}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Items */}
      {isExpanded && (
        <div className="border-t px-4 py-2">
          {checklist.items
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <div
                key={item.id}
                className="group flex items-center gap-3 py-2"
              >
                <Checkbox
                  checked={item.isChecked}
                  onCheckedChange={() => onToggleItem(item.id)}
                />
                <span
                  className={cn(
                    'min-w-0 flex-1 break-all text-sm',
                    item.isChecked && 'text-muted-foreground line-through'
                  )}
                >
                  {item.text}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={() => onDeleteItem(item.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

          {/* Add Item */}
          {isAddingItem ? (
            <div className="flex items-center gap-2 py-2">
              <div className="h-4 w-4 rounded border border-muted-foreground/50" />
              <Input
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => {
                  // IME変換中は無視（日本語入力対応）
                  if (e.nativeEvent.isComposing) {
                    return;
                  }
                  if (e.key === 'Enter') {
                    handleAddItem();
                  } else if (e.key === 'Escape') {
                    setIsAddingItem(false);
                    setNewItemText('');
                  }
                }}
                placeholder="アイテムを追加"
                className="h-8 flex-1"
                autoFocus
              />
              <Button size="sm" onClick={handleAddItem}>
                追加
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingItem(false);
                  setNewItemText('');
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setIsAddingItem(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setIsAddingItem(true);
                }
              }}
              className="flex cursor-pointer items-center gap-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <div className="h-4 w-4 rounded border border-muted-foreground/50" />
              <span>アイテムを追加</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
