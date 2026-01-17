'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  rectIntersection,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BoardList } from './BoardList';
import { TaskCard } from './TaskCard';
import { useBoard } from '@/hooks/useBoard';
import { useAuthStore } from '@/stores/authStore';
import type { Task, List } from '@/types';
import { LIST_COLORS } from '@/types';
import { cn } from '@/lib/utils';
import type { BoardFilters } from './BoardFilterBar';
import { startOfDay, endOfDay, endOfWeek, isBefore, isAfter, isWithinInterval } from 'date-fns';

interface BoardViewProps {
  projectId: string;
  onTaskClick: (taskId: string) => void;
  filters?: BoardFilters;
}

export function BoardView({ projectId, onTaskClick, filters }: BoardViewProps) {
  const { firebaseUser } = useAuthStore();
  const {
    lists,
    tasks,
    labels,
    tags,
    isLoading,
    getTasksByListId,
    addList,
    editList,
    removeList,
    reorderLists,
    addTask,
    moveTask,
    reorderTasks,
  } = useBoard(projectId);

  // Filter tasks based on filter criteria
  const filterTask = useCallback((task: Task): boolean => {
    if (!filters) return true;

    // Keyword filter
    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      if (!task.title.toLowerCase().includes(keyword) &&
          !task.description?.toLowerCase().includes(keyword)) {
        return false;
      }
    }

    // Completed filter
    if (!filters.showCompleted && task.isCompleted) {
      return false;
    }

    // Label filter
    if (filters.labelIds.size > 0) {
      const hasMatchingLabel = task.labelIds.some(id => filters.labelIds.has(id));
      if (!hasMatchingLabel) return false;
    }

    // Due date filter
    if (filters.dueFilter !== 'all') {
      const now = new Date();
      const today = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      switch (filters.dueFilter) {
        case 'today':
          if (!task.dueDate || !isWithinInterval(task.dueDate, { start: today, end: todayEnd })) {
            return false;
          }
          break;
        case 'week':
          if (!task.dueDate || !isWithinInterval(task.dueDate, { start: today, end: weekEnd })) {
            return false;
          }
          break;
        case 'overdue':
          if (!task.dueDate || !isBefore(task.dueDate, today) || task.isCompleted) {
            return false;
          }
          break;
        case 'none':
          if (task.dueDate) {
            return false;
          }
          break;
      }
    }

    return true;
  }, [filters]);

  // Get filtered tasks for a specific list
  const getFilteredTasksByListId = useCallback(
    (listId: string) => {
      return getTasksByListId(listId).filter(filterTask);
    },
    [getTasksByListId, filterTask]
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeList, setActiveList] = useState<List | null>(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState<string>(LIST_COLORS[0].value);

  // Local list order for optimistic updates
  const [localLists, setLocalLists] = useState<List[]>([]);
  const isDraggingList = useRef(false);

  // Sync local lists with Firestore lists (but not during drag)
  useEffect(() => {
    if (!isDraggingList.current) {
      setLocalLists(lists);
    }
  }, [lists]);

  // Use local lists for rendering (optimistic updates)
  const displayLists = localLists.length > 0 ? localLists : lists;

  // Delete list dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [targetListId, setTargetListId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom collision detection: use pointerWithin for lists, rectIntersection for tasks
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const { active } = args;
    const activeData = active.data.current;

    // For list dragging, use pointerWithin (more precise)
    if (activeData?.type === 'list') {
      // Only consider other lists (exclude droppable areas like "list-xxx")
      const listCollisions = pointerWithin({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (container) => {
            const id = String(container.id);
            // Only match list IDs, not droppable "list-xxx" IDs
            return !id.startsWith('list-') && displayLists.some((l) => l.id === id);
          }
        ),
      });
      if (listCollisions.length > 0) {
        return listCollisions;
      }
    }

    // For tasks or fallback, use rectIntersection
    return rectIntersection(args);
  }, [displayLists]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const activeData = active.data.current;

      if (activeData?.type === 'list') {
        isDraggingList.current = true;
        setActiveList(activeData.list);
        setActiveTask(null);
      } else {
        const task = tasks.find((t) => t.id === active.id);
        if (task) {
          setActiveTask(task);
          setActiveList(null);
        }
      }
    },
    [tasks]
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      // Skip if dragging a list
      const activeData = active.data.current;
      if (activeData?.type === 'list') return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Find the active task
      const activeTask = tasks.find((t) => t.id === activeId);
      if (!activeTask) return;

      // Check if dropping over a list
      if (overId.startsWith('list-')) {
        const newListId = overId.replace('list-', '');
        if (activeTask.listId !== newListId) {
          // Move to new list
          const tasksInNewList = getTasksByListId(newListId);
          moveTask(activeId, newListId, tasksInNewList.length);
        }
        return;
      }

      // Dropping over another task
      const overTask = tasks.find((t) => t.id === overId);
      if (!overTask) return;

      if (activeTask.listId !== overTask.listId) {
        // Move to different list
        const tasksInNewList = getTasksByListId(overTask.listId);
        const overIndex = tasksInNewList.findIndex((t) => t.id === overId);
        moveTask(activeId, overTask.listId, overIndex);
      }
    },
    [tasks, getTasksByListId, moveTask]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setActiveList(null);

      const activeData = active.data.current;

      // Clear dragging flag for lists
      if (activeData?.type === 'list') {
        isDraggingList.current = false;
      }

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      if (activeId === overId) return;

      // Handle list reordering
      if (activeData?.type === 'list') {
        const activeIndex = displayLists.findIndex((l) => l.id === activeId);
        const overIndex = displayLists.findIndex((l) => l.id === overId);

        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          // Optimistic update: immediately update local state
          const reordered = arrayMove(displayLists, activeIndex, overIndex);
          setLocalLists(reordered);

          // Then persist to Firestore
          reorderLists(reordered);
        }
        return;
      }

      // Handle task reordering
      const activeTaskItem = tasks.find((t) => t.id === activeId);
      const overTask = tasks.find((t) => t.id === overId);

      if (!activeTaskItem) return;

      // If both tasks are in the same list, reorder
      if (overTask && activeTaskItem.listId === overTask.listId) {
        const listTasks = getTasksByListId(activeTaskItem.listId);
        const activeIndex = listTasks.findIndex((t) => t.id === activeId);
        const overIndex = listTasks.findIndex((t) => t.id === overId);

        if (activeIndex !== overIndex) {
          const reordered = arrayMove(listTasks, activeIndex, overIndex);
          reorderTasks(
            activeTaskItem.listId,
            reordered.map((t) => t.id)
          );
        }
      }
    },
    [tasks, displayLists, getTasksByListId, reorderTasks, reorderLists]
  );

  const handleAddList = () => {
    if (newListName.trim()) {
      addList(newListName.trim(), newListColor);
      setNewListName('');
      setNewListColor(LIST_COLORS[0].value);
      setIsAddingList(false);
    }
  };

  const handleAddTask = (listId: string) => (title: string) => {
    if (firebaseUser) {
      addTask(listId, title, firebaseUser.uid);
    }
  };

  const handleDeleteListRequest = (list: List) => {
    const tasksInList = getTasksByListId(list.id);
    if (tasksInList.length === 0) {
      // No tasks, delete immediately
      if (confirm('このリストを削除しますか？')) {
        removeList(list.id);
      }
    } else {
      // Has tasks, show dialog
      setListToDelete(list);
      // Default to first available list (not the one being deleted)
      const otherLists = displayLists.filter((l) => l.id !== list.id);
      if (otherLists.length > 0) {
        setTargetListId(otherLists[0].id);
      }
      setDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!listToDelete) return;

    setIsDeleting(true);
    try {
      await removeList(listToDelete.id, targetListId);
      setDeleteDialogOpen(false);
      setListToDelete(null);
      setTargetListId('');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="pb-4" data-testid="board-view">
        <div className="flex min-w-max gap-4">
          <SortableContext
            items={displayLists.map((l) => l.id)}
            strategy={horizontalListSortingStrategy}
          >
            {displayLists.map((list) => (
              <BoardList
                key={list.id}
                projectId={projectId}
                list={list}
                tasks={getFilteredTasksByListId(list.id)}
                labels={labels}
                tags={tags}
                onAddTask={handleAddTask(list.id)}
                onEditList={(data) => editList(list.id, data)}
                onDeleteList={() => handleDeleteListRequest(list)}
                onTaskClick={onTaskClick}
              />
            ))}
          </SortableContext>

          {/* Add List */}
          <div className="flex w-72 flex-shrink-0">
          {isAddingList ? (
            <div className="w-full rounded-lg bg-gray-100 p-3">
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="リスト名を入力..."
                className="mb-2"
                autoFocus
                onKeyDown={(e) => {
                  // IME変換中は無視（日本語入力対応）
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Enter') handleAddList();
                  if (e.key === 'Escape') {
                    setNewListName('');
                    setIsAddingList(false);
                  }
                }}
              />
              <div className="mb-2 flex flex-wrap gap-1">
                {LIST_COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setNewListColor(color.value)}
                    className={cn(
                      'h-5 w-5 rounded-full transition-transform hover:scale-110',
                      newListColor === color.value &&
                        'ring-2 ring-offset-1 ring-primary'
                    )}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddList}>
                  追加
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewListName('');
                    setIsAddingList(false);
                  }}
                >
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="h-auto w-full justify-start border-dashed py-6"
              onClick={() => setIsAddingList(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              リストを追加
            </Button>
          )}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && (
          <TaskCard
            projectId={projectId}
            task={activeTask}
            labels={labels.filter((l) => activeTask.labelIds.includes(l.id))}
            tags={tags.filter((t) => activeTask.tagIds?.includes(t.id))}
            onClick={() => {}}
            isDragging
          />
        )}
        {activeList && (
          <div className="w-72 rounded-lg bg-gray-100 p-3 shadow-xl ring-2 ring-primary/20">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: activeList.color }}
              />
              <span className="font-semibold">{activeList.name}</span>
              <span className="text-sm text-muted-foreground">
                {getTasksByListId(activeList.id).length}
              </span>
            </div>
          </div>
        )}
      </DragOverlay>

      {/* Delete List Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              リスト削除の確認
            </DialogTitle>
            <DialogDescription>
              リスト「{listToDelete?.name}」には
              {listToDelete && getTasksByListId(listToDelete.id).length}件の
              タスクがあります。タスクを別のリストに移動してから削除します。
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium">
              タスクの移動先
            </label>
            <Select value={targetListId} onValueChange={setTargetListId}>
              <SelectTrigger>
                <SelectValue placeholder="移動先のリストを選択" />
              </SelectTrigger>
              <SelectContent>
                {displayLists
                  .filter((l) => l.id !== listToDelete?.id)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: l.color }}
                        />
                        {l.name}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting || !targetListId}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              タスクを移動して削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
