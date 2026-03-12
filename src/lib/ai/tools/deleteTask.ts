import { archiveTask, getTask, restoreTask } from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';

// Delete (archive) task argument types
export interface DeleteTaskArgs {
  taskId: string;
}

export interface DeleteTaskResult {
  taskId: string;
  title: string;
  success: boolean;
  message: string;
}

/**
 * delete_task tool definition
 * Note: This actually archives the task (soft delete) - it can be restored later
 */
export const deleteTaskToolDefinition: AITool = {
  name: 'delete_task',
  description:
    'タスクを削除（アーカイブ）します。アーカイブされたタスクは「アーカイブ済み」から復元できます。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: '削除するタスクのID（必須）',
      },
    },
    required: ['taskId'],
  },
};

/**
 * delete_task handler - archives the task instead of permanently deleting
 */
export const deleteTaskHandler: ToolHandler<DeleteTaskArgs, DeleteTaskResult> = async (
  args,
  context
) => {
  const { taskId } = args;
  const { projectId, userId } = context;

  // Get task info before archiving for confirmation message
  const task = await getTask(projectId, taskId);
  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  await archiveTask(projectId, taskId, userId);

  return {
    taskId,
    title: task.title,
    success: true,
    message: 'タスクをアーカイブしました。設定画面の「アーカイブ済みタスク」から復元できます。',
  };
};

// Restore task argument types
export interface RestoreTaskArgs {
  taskId: string;
}

export interface RestoreTaskResult {
  taskId: string;
  title: string;
  success: boolean;
}

/**
 * restore_task tool definition
 */
export const restoreTaskToolDefinition: AITool = {
  name: 'restore_task',
  description:
    'アーカイブされたタスクを復元します。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: '復元するタスクのID（必須）',
      },
    },
    required: ['taskId'],
  },
};

/**
 * restore_task handler
 */
export const restoreTaskHandler: ToolHandler<RestoreTaskArgs, RestoreTaskResult> = async (
  args,
  context
) => {
  const { taskId } = args;
  const { projectId } = context;

  const task = await getTask(projectId, taskId);
  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  if (!task.isArchived) {
    throw new Error('このタスクはアーカイブされていません');
  }

  await restoreTask(projectId, taskId);

  return {
    taskId,
    title: task.title,
    success: true,
  };
};
