import { AIContext, AITaskContext, AIProjectContext } from '@/types/ai';

/**
 * Build AI context from project data
 */
export function buildProjectContext(project: {
  id: string;
  name: string;
  description?: string | null;
  lists?: Array<{
    id: string;
    name: string;
    tasks?: Array<unknown>;
  }>;
  members?: Array<{
    id: string;
    displayName: string;
  }>;
}): AIProjectContext {
  return {
    id: project.id,
    name: project.name,
    description: project.description || '',
    lists: (project.lists || []).map((list) => ({
      id: list.id,
      name: list.name,
      taskCount: list.tasks?.length || 0,
    })),
    members: (project.members || []).map((member) => ({
      id: member.id,
      displayName: member.displayName,
    })),
  };
}

/**
 * Build AI context from task data
 */
export function buildTaskContext(task: {
  id: string;
  title: string;
  description?: string | null;
  priority?: string | null;
  dueDate?: Date | null;
  listName?: string;
  assignees?: Array<{ displayName: string }>;
  comments?: Array<{
    content: string;
    authorName?: string;
    createdAt: Date;
  }>;
  checklists?: Array<{
    title: string;
    items: Array<{
      text: string;
      isChecked: boolean;
    }>;
  }>;
}): AITaskContext {
  return {
    id: task.id,
    title: task.title,
    description: task.description || '',
    priority: task.priority || null,
    dueDate: task.dueDate || null,
    status: task.listName || '未設定',
    assignees: (task.assignees || []).map((a) => a.displayName),
    comments: (task.comments || []).slice(-5).map((c) => ({
      content: c.content,
      authorName: c.authorName || '不明',
      createdAt: c.createdAt,
    })),
    checklists: (task.checklists || []).map((cl) => ({
      title: cl.title,
      items: cl.items.map((item) => ({
        text: item.text,
        isChecked: item.isChecked,
      })),
    })),
  };
}

/**
 * Build full AI context
 */
export function buildAIContext(options: {
  user: { id: string; displayName: string };
  project: Parameters<typeof buildProjectContext>[0];
  task?: Parameters<typeof buildTaskContext>[0];
}): AIContext {
  return {
    user: {
      id: options.user.id,
      displayName: options.user.displayName,
    },
    project: buildProjectContext(options.project),
    task: options.task ? buildTaskContext(options.task) : undefined,
  };
}
