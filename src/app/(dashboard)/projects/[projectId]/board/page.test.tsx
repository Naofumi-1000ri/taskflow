import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BoardPage from './page';
import { useBoard } from '@/hooks/useBoard';
import { useProject } from '@/hooks/useProjects';
import { useAuthStore } from '@/stores/authStore';

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useParams: () => ({ projectId: 'project-1' }),
  usePathname: () => '/projects/project-1/board',
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

vi.mock('@/hooks/useBoard', () => ({
  useBoard: vi.fn(),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProject: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('@/components/board/BoardView', () => ({
  BoardView: ({ onTaskClick }: { onTaskClick: (taskId: string) => void }) => (
    <button onClick={() => onTaskClick('task-1')}>open task 1</button>
  ),
}));

vi.mock('@/components/board/BoardFilterBar', () => ({
  BoardFilterBar: () => <div>filters</div>,
}));

vi.mock('@/components/board/ProjectUrlsBar', () => ({
  ProjectUrlsBar: () => <div>urls</div>,
}));

vi.mock('@/components/task/TaskDetailModal', () => ({
  TaskDetailModal: ({
    task,
    isOpen,
    onClose,
  }: {
    task: { id: string; title: string } | null;
    isOpen: boolean;
    onClose: () => void;
  }) => (
    <div>
      <div data-testid="modal-state">{isOpen ? 'open' : 'closed'}</div>
      <div data-testid="modal-task">{task?.title ?? 'none'}</div>
      <button onClick={onClose}>close modal</button>
    </div>
  ),
}));

const mockedUseBoard = vi.mocked(useBoard);
const mockedUseProject = vi.mocked(useProject);
const mockedUseAuthStore = vi.mocked(useAuthStore);

const tasks = [
  {
    id: 'task-1',
    title: 'First task',
  },
  {
    id: 'task-2',
    title: 'Second task',
  },
];

describe('BoardPage', () => {
  beforeEach(() => {
    searchParams = new URLSearchParams();
    replace.mockReset();

    mockedUseBoard.mockReturnValue({
      lists: [],
      tasks: tasks as never,
      labels: [],
      editTask: vi.fn(),
      removeTask: vi.fn(),
      duplicateTask: vi.fn(),
    } as ReturnType<typeof useBoard>);

    mockedUseProject.mockReturnValue({
      project: { urls: [] },
      update: vi.fn(),
    } as ReturnType<typeof useProject>);

    mockedUseAuthStore.mockReturnValue({
      user: { id: 'user-1' },
    } as ReturnType<typeof useAuthStore>);
  });

  it('opens the task modal from the task query parameter', () => {
    searchParams = new URLSearchParams('task=task-2');

    render(<BoardPage />);

    expect(screen.getByTestId('modal-state')).toHaveTextContent('open');
    expect(screen.getByTestId('modal-task')).toHaveTextContent('Second task');
  });

  it('ignores unknown task ids from the query parameter', () => {
    searchParams = new URLSearchParams('task=missing-task');

    render(<BoardPage />);

    expect(screen.getByTestId('modal-state')).toHaveTextContent('closed');
    expect(screen.getByTestId('modal-task')).toHaveTextContent('none');
  });

  it('syncs board clicks and modal close events back to the URL', async () => {
    const user = userEvent.setup();

    render(<BoardPage />);

    await user.click(screen.getByRole('button', { name: 'open task 1' }));

    expect(replace).toHaveBeenCalledWith('/projects/project-1/board?task=task-1', { scroll: false });

    await user.click(screen.getByRole('button', { name: 'close modal' }));

    await waitFor(() => {
      expect(replace).toHaveBeenLastCalledWith('/projects/project-1/board', { scroll: false });
    });
  });
});
