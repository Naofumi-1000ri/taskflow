import type { ReactNode } from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskCard } from './TaskCard';
import type { Label, Tag, Task } from '@/types';

vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => undefined,
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div data-testid="task-card-hover-details">{children}</div>
  ),
}));

vi.mock('@/lib/firebase/firestore', () => ({
  getUsersByIds: vi.fn().mockResolvedValue([]),
  getTaskAttachments: vi.fn().mockResolvedValue([]),
  getProject: vi.fn().mockResolvedValue({ name: 'プロジェクト' }),
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ sendBellNotification: vi.fn() }),
}));

const baseTask: Task = {
  id: 'task-1',
  projectId: 'project-1',
  listId: 'list-1',
  title: 'タスクカードの日付とステータスを見やすくするための長いタイトル',
  description: 'ホバーで表示する詳細です',
  order: 0,
  assigneeIds: [],
  labelIds: ['label-1'],
  tagIds: ['tag-1'],
  dependsOnTaskIds: [],
  priority: 'high',
  startDate: new Date('2026-07-15T00:00:00.000Z'),
  dueDate: new Date('2026-07-18T00:00:00.000Z'),
  durationDays: null,
  isDueDateFixed: false,
  isCompleted: false,
  completedAt: null,
  isAbandoned: false,
  isArchived: false,
  archivedAt: null,
  archivedBy: null,
  createdBy: 'user-1',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
  updatedAt: new Date('2026-07-01T00:00:00.000Z'),
};

const labels: Label[] = [{
  id: 'label-1',
  projectId: 'project-1',
  name: 'デザイン',
  color: '#7c3aed',
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
}];

const tags: Tag[] = [{
  id: 'tag-1',
  projectId: 'project-1',
  name: 'UI改善',
  color: '#0891b2',
  order: 0,
  createdAt: new Date('2026-07-01T00:00:00.000Z'),
}];

function renderTaskCard(task: Task = baseTask) {
  return render(
    <TaskCard
      projectId="project-1"
      task={task}
      listName="進行中"
      listColor="#2563eb"
      labels={labels}
      tags={tags}
      allTasks={[task]}
      onClick={vi.fn()}
    />
  );
}

describe('TaskCard', () => {
  it('shows the date rail and keeps the summary compact', () => {
    renderTaskCard();

    const card = screen.getByTestId('task-card');
    const dateRail = within(card).getByTestId('task-card-date-rail');
    const title = within(card).getByText(baseTask.title);

    expect(dateRail).toHaveTextContent('7/15〜7/18');
    expect(title).toHaveClass('line-clamp-2');
    expect(within(card).getByText('高')).toBeInTheDocument();
    expect(within(card).getByText('進行中')).toBeInTheDocument();
    expect(within(card).queryByText(baseTask.description)).not.toBeInTheDocument();
    expect(within(card).queryByText('デザイン')).not.toBeInTheDocument();
    expect(within(card).queryByText('UI改善')).not.toBeInTheDocument();
  });

  it('moves the description, labels, and tags into hover details', () => {
    renderTaskCard();

    const details = screen.getByTestId('task-card-hover-details');

    expect(within(details).getByText(baseTask.description)).toBeInTheDocument();
    expect(within(details).getByText('デザイン')).toBeInTheDocument();
    expect(within(details).getByText('UI改善')).toBeInTheDocument();
  });

  it('uses the full content width when neither date is set', () => {
    renderTaskCard({
      ...baseTask,
      startDate: null,
      dueDate: null,
      description: '',
      labelIds: [],
      tagIds: [],
    });

    const card = screen.getByTestId('task-card');

    expect(within(card).queryByTestId('task-card-date-rail')).not.toBeInTheDocument();
    expect(within(card).getByText('進行中')).toBeInTheDocument();
  });
});
