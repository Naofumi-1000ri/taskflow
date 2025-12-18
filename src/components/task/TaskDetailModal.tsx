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
  User,
  Tag,
  ListChecks,
  Trash2,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Send,
  Star,
  Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskDetails } from '@/hooks/useTaskDetails';
import { useAuthStore } from '@/stores/authStore';
import type { Task, Label as LabelType, List, Priority, Checklist } from '@/types';

interface TaskDetailModalProps {
  task: Task | null;
  projectId: string;
  lists: List[];
  labels: LabelType[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (data: Partial<Task>) => void;
  onDelete: () => void;
}

export function TaskDetailModal({
  task,
  projectId,
  lists,
  labels,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: TaskDetailModalProps) {
  const { user } = useAuthStore();
  const {
    checklists,
    comments,
    addChecklist,
    removeChecklist,
    addChecklistItem,
    toggleChecklistItem,
    removeChecklistItem,
    addComment,
  } = useTaskDetails(projectId, task?.id || null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listId, setListId] = useState('');
  const [priority, setPriority] = useState<Priority | null>(null);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [expandedChecklists, setExpandedChecklists] = useState<Set<string>>(new Set());

  // Initialize form when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setListId(task.listId);
      setPriority(task.priority);
      setDueDate(task.dueDate || undefined);
      setStartDate(task.startDate || undefined);
      setSelectedLabelIds(task.labelIds);
      setIsCompleted(task.isCompleted);
    }
  }, [task]);

  // Expand all checklists by default
  useEffect(() => {
    if (checklists.length > 0) {
      setExpandedChecklists(new Set(checklists.map(c => c.id)));
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
    });
  };

  const handleLabelToggle = (labelId: string) => {
    const newLabelIds = selectedLabelIds.includes(labelId)
      ? selectedLabelIds.filter((id) => id !== labelId)
      : [...selectedLabelIds, labelId];
    setSelectedLabelIds(newLabelIds);
    onUpdate({ labelIds: newLabelIds });
  };

  const handleAddComment = async () => {
    if (user && commentText.trim()) {
      await addComment(commentText.trim(), user.id, []);
      setCommentText('');
    }
  };

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
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <DialogTitle className="mt-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className={cn(
                  'border-none p-0 text-xl font-bold shadow-none focus-visible:ring-0',
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
          <ScrollArea className="flex-1">
            <div className="space-y-1 px-6 py-4">
              {/* Description (if editing) */}
              {description !== undefined && (
                <div className="mb-4">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSave}
                    placeholder="タスクの詳細を入力..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}

              {/* Metadata Row */}
              <div className="space-y-3">
                {/* Date */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground">
                        {startDate || dueDate ? (
                          <span>
                            {startDate && format(startDate, 'M/d', { locale: ja })}
                            {startDate && dueDate && ' - '}
                            {dueDate && format(dueDate, 'M/d', { locale: ja })}
                          </span>
                        ) : (
                          '期間を設定'
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4" align="start">
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-sm font-medium">開始日</p>
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => {
                              setStartDate(date);
                              onUpdate({ startDate: date || null });
                            }}
                          />
                        </div>
                        <Separator />
                        <div>
                          <p className="mb-2 text-sm font-medium">期限</p>
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={(date) => {
                              setDueDate(date);
                              onUpdate({ dueDate: date || null });
                            }}
                          />
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span className="text-muted-foreground">担当者を追加</span>
                </div>

                {/* Labels */}
                <div className="flex items-center gap-3 py-2 text-sm">
                  <Tag className="h-5 w-5 text-muted-foreground" />
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
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {comment.authorId.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="rounded-lg bg-muted p-3">
                            <p className="text-sm">{comment.content}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format(comment.createdAt, 'M/d HH:mm', { locale: ja })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment Input */}
                <div className="rounded-lg border p-3">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="コメントを書く"
                    rows={3}
                    className="resize-none border-none p-0 shadow-none focus-visible:ring-0"
                  />
                  <div className="mt-2 flex items-center justify-end">
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                    >
                      コメントを投稿
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
                    'flex-1 text-sm',
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
