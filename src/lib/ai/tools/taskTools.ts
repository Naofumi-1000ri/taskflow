import { updateTask, getTask, getProjectLists } from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';

// ============================================
// complete_task
// ============================================

export interface CompleteTaskArgs {
  taskId: string;
  isCompleted: boolean;
}

export interface CompleteTaskResult {
  taskId: string;
  title: string;
  isCompleted: boolean;
  success: boolean;
}

export const completeTaskToolDefinition: AITool = {
  name: 'complete_task',
  description:
    'タスクを完了または未完了にします。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'タスクのID（必須）',
      },
      isCompleted: {
        type: 'boolean',
        description: '完了状態（true=完了にする, false=未完了に戻す）',
      },
    },
    required: ['taskId', 'isCompleted'],
  },
};

export const completeTaskHandler: ToolHandler<CompleteTaskArgs, CompleteTaskResult> = async (
  args,
  context
) => {
  const { taskId, isCompleted } = args;
  const { projectId } = context;

  const task = await getTask(projectId, taskId);
  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  await updateTask(projectId, taskId, {
    isCompleted,
    completedAt: isCompleted ? new Date() : null,
  });

  return {
    taskId,
    title: task.title,
    isCompleted,
    success: true,
  };
};

// ============================================
// move_task
// ============================================

export interface MoveTaskArgs {
  taskId: string;
  listId: string;
}

export interface MoveTaskResult {
  taskId: string;
  title: string;
  fromList: string;
  toList: string;
  success: boolean;
}

export const moveTaskToolDefinition: AITool = {
  name: 'move_task',
  description:
    'タスクを別のリスト（カラム）に移動します。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'タスクのID（必須）',
      },
      listId: {
        type: 'string',
        description: '移動先のリストID（必須）',
      },
    },
    required: ['taskId', 'listId'],
  },
};

export const moveTaskHandler: ToolHandler<MoveTaskArgs, MoveTaskResult> = async (
  args,
  context
) => {
  const { taskId, listId } = args;
  const { projectId } = context;

  const task = await getTask(projectId, taskId);
  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  const lists = await getProjectLists(projectId);
  const fromList = lists.find((l) => l.id === task.listId);
  const toList = lists.find((l) => l.id === listId);

  if (!toList) {
    throw new Error('移動先のリストが見つかりません');
  }

  await updateTask(projectId, taskId, {
    listId,
    order: Date.now(), // Move to end of new list
  });

  return {
    taskId,
    title: task.title,
    fromList: fromList?.name || task.listId,
    toList: toList.name,
    success: true,
  };
};

// ============================================
// assign_task
// ============================================

export interface AssignTaskArgs {
  taskId: string;
  assigneeIds: string[];
}

export interface AssignTaskResult {
  taskId: string;
  title: string;
  assigneeIds: string[];
  success: boolean;
}

export const assignTaskToolDefinition: AITool = {
  name: 'assign_task',
  description:
    'タスクに担当者を設定します。既存の担当者は上書きされます。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'タスクのID（必須）',
      },
      assigneeIds: {
        type: 'array',
        description: '担当者のユーザーID配列。空配列で担当者をクリア。',
        items: {
          type: 'string',
        },
      },
    },
    required: ['taskId', 'assigneeIds'],
  },
};

export const assignTaskHandler: ToolHandler<AssignTaskArgs, AssignTaskResult> = async (
  args,
  context
) => {
  const { taskId, assigneeIds } = args;
  const { projectId } = context;

  const task = await getTask(projectId, taskId);
  if (!task) {
    throw new Error('タスクが見つかりません');
  }

  await updateTask(projectId, taskId, {
    assigneeIds,
  });

  return {
    taskId,
    title: task.title,
    assigneeIds,
    success: true,
  };
};
