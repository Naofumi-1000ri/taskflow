import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoardList } from './BoardList';
import type { List, Task } from '@/types';

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: () => undefined,
    isOver: false,
  }),
}));

vi.mock('./TaskCard', () => ({
  TaskCard: ({
    task,
    onClick,
    onMove,
  }: {
    task: Task;
    onClick: () => void;
    onMove: (listId: string) => void;
  }) => (
    <div>
      <button onClick={onClick}>{task.title}</button>
      <button onClick={() => onMove('list-2')}>別の看板へ移動</button>
    </div>
  ),
}));

const list: List = {
  id: 'list-1',
  projectId: 'project-1',
  name: '依頼事項',
  color: '#8b5cf6',
  order: 0,
  autoCompleteOnEnter: false,
  autoUncompleteOnExit: false,
  autoSetStartDateOnEnter: false,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const task: Task = {
  id: 'task-1',
  projectId: 'project-1',
  listId: 'list-1',
  title: '既存タスク',
  description: '',
  order: 0,
  assigneeIds: [],
  labelIds: [],
  tagIds: [],
  dependsOnTaskIds: [],
  priority: null,
  startDate: null,
  dueDate: null,
  durationDays: null,
  isDueDateFixed: false,
  isCompleted: false,
  completedAt: null,
  isAbandoned: false,
  isArchived: false,
  archivedAt: null,
  archivedBy: null,
  createdBy: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('BoardList', () => {
  it('keeps the task composer at the bottom when launched from the bottom add button', () => {
    const onAddTask = vi.fn();

    render(
      <BoardList
        projectId="project-1"
        list={list}
        tasks={[task]}
        allTasks={[task]}
        labels={[]}
        tags={[]}
        onAddTask={onAddTask}
        onEditList={vi.fn()}
        onDeleteList={vi.fn()}
        onTaskClick={vi.fn()}
        allLists={[list]}
        onTaskMove={vi.fn()}
      />
    );

    expect(screen.getAllByRole('button', { name: 'タスクを追加' })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'タスクを追加' })[1]);

    expect(screen.getByPlaceholderText('タスク名を入力...')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'タスクを追加' })).toHaveLength(1);

    fireEvent.change(screen.getByPlaceholderText('タスク名を入力...'), {
      target: { value: '末尾で追加するタスク' },
    });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(onAddTask).toHaveBeenCalledWith('末尾で追加するタスク', 'bottom');
    expect(screen.getAllByRole('button', { name: 'タスクを追加' })).toHaveLength(2);
  });

  it('reports top position when launched from the top add button', () => {
    const onAddTask = vi.fn();

    render(
      <BoardList
        projectId="project-1"
        list={list}
        tasks={[task]}
        allTasks={[task]}
        labels={[]}
        tags={[]}
        onAddTask={onAddTask}
        onEditList={vi.fn()}
        onDeleteList={vi.fn()}
        onTaskClick={vi.fn()}
        allLists={[list]}
        onTaskMove={vi.fn()}
      />
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'タスクを追加' })[0]);

    fireEvent.change(screen.getByPlaceholderText('タスク名を入力...'), {
      target: { value: '先頭で追加するタスク' },
    });
    fireEvent.click(screen.getByRole('button', { name: '追加' }));

    expect(onAddTask).toHaveBeenCalledWith('先頭で追加するタスク', 'top');
  });

  it('keeps normal task clicks and routes context-menu moves with the task id', () => {
    const onTaskClick = vi.fn();
    const onTaskMove = vi.fn();

    render(
      <BoardList
        projectId="project-1"
        list={list}
        tasks={[task]}
        allTasks={[task]}
        labels={[]}
        tags={[]}
        onAddTask={vi.fn()}
        onEditList={vi.fn()}
        onDeleteList={vi.fn()}
        onTaskClick={onTaskClick}
        allLists={[list]}
        onTaskMove={onTaskMove}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '既存タスク' }));
    fireEvent.click(screen.getByRole('button', { name: '別の看板へ移動' }));

    expect(onTaskClick).toHaveBeenCalledWith('task-1');
    expect(onTaskMove).toHaveBeenCalledWith('task-1', 'list-2');
  });
});
