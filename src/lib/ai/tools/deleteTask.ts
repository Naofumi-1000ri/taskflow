import { deleteTask, getTask } from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';

// Delete task argument types
export interface DeleteTaskArgs {
  taskId: string;
}

export interface DeleteTaskResult {
  taskId: string;
  title: string;
  success: boolean;
}

/**
 * delete_task tool definition
 */
export const deleteTaskToolDefinition: AITool = {
  name: 'delete_task',
  description:
    'タスクを削除します。この操作は取り消せません。',
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
 * delete_task handler
 */
export const deleteTaskHandler: ToolHandler<DeleteTaskArgs, DeleteTaskResult> = async (
  args,
  context
) => {
  const { taskId } = args;
  const { projectId } = context;

  // Get task info before deletion for confirmation message
  const task = await getTask(projectId, taskId);
  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  await deleteTask(projectId, taskId);

  return {
    taskId,
    title: task.title,
    success: true,
  };
};
