import {
  updateTask,
  getTask,
  getProjectLists,
  createTask,
  getTaskAttachments,
  createAttachment,
  getProject,
} from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';

// ============================================
// complete_task
// ============================================

export interface CompleteTaskArgs {
  projectId?: string;
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
      projectId: {
        type: 'string',
        description: 'タスクが属するプロジェクトのID（ダッシュボードから操作する場合に必要。プロジェクトページでは不要）',
      },
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
  const { projectId: argsProjectId, taskId, isCompleted } = args;
  const projectId = context.projectId || argsProjectId;

  if (!projectId) {
    throw new Error('プロジェクトIDが指定されていません。get_my_tasks_across_projects で取得したprojectIdを指定してください。');
  }

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

// ============================================
// copy_task_to_project
// ============================================

export interface CopyTaskToProjectArgs {
  sourceProjectId: string;
  taskId: string;
  targetProjectId: string;
  targetListId?: string;
  includeAttachments?: boolean;
}

export interface CopyTaskToProjectResult {
  success: boolean;
  sourceTaskId: string;
  newTaskId: string;
  sourceProjectName: string;
  targetProjectName: string;
  targetListName: string;
  copiedAttachments: number;
  title: string;
}

export const copyTaskToProjectToolDefinition: AITool = {
  name: 'copy_task_to_project',
  description:
    '別のプロジェクトにタスクをコピーします。添付ファイルも一緒にコピーできます。元のタスクは残ります。',
  parameters: {
    type: 'object',
    properties: {
      sourceProjectId: {
        type: 'string',
        description: 'コピー元のプロジェクトID（必須）',
      },
      taskId: {
        type: 'string',
        description: 'コピーするタスクのID（必須）',
      },
      targetProjectId: {
        type: 'string',
        description: 'コピー先のプロジェクトID（必須）',
      },
      targetListId: {
        type: 'string',
        description: 'コピー先のリストID（省略時は最初のリスト）',
      },
      includeAttachments: {
        type: 'boolean',
        description: '添付ファイルもコピーするか（デフォルト: true）',
      },
    },
    required: ['sourceProjectId', 'taskId', 'targetProjectId'],
  },
};

export const copyTaskToProjectHandler: ToolHandler<CopyTaskToProjectArgs, CopyTaskToProjectResult> = async (
  args,
  context
) => {
  const {
    sourceProjectId,
    taskId,
    targetProjectId,
    targetListId,
    includeAttachments = true,
  } = args;

  // Verify source task exists
  const sourceTask = await getTask(sourceProjectId, taskId);
  if (!sourceTask) {
    throw new Error('コピー元のタスクが見つかりません');
  }

  // Get project info
  const sourceProject = await getProject(sourceProjectId);
  const targetProject = await getProject(targetProjectId);
  if (!targetProject) {
    throw new Error('コピー先のプロジェクトが見つかりません');
  }

  // Get target list
  const targetLists = await getProjectLists(targetProjectId);
  if (targetLists.length === 0) {
    throw new Error('コピー先のプロジェクトにリストがありません');
  }

  let selectedList = targetLists[0];
  if (targetListId) {
    const foundList = targetLists.find(l => l.id === targetListId);
    if (!foundList) {
      throw new Error('指定されたリストが見つかりません');
    }
    selectedList = foundList;
  }

  // Create new task in target project
  const newTaskData = {
    title: sourceTask.title,
    description: sourceTask.description || '',
    listId: selectedList.id,
    order: Date.now(),
    priority: sourceTask.priority || 'medium',
    labelIds: [], // Labels may not exist in target project
    assigneeIds: [], // Assignees may not be members of target project
    tagIds: [],
    dependsOnTaskIds: [],
    dueDate: sourceTask.dueDate || null,
    startDate: sourceTask.startDate || null,
    durationDays: sourceTask.durationDays || null,
    isDueDateFixed: sourceTask.isDueDateFixed || false,
    isCompleted: false,
    completedAt: null,
    isAbandoned: false,
    isArchived: false,
    archivedAt: null,
    archivedBy: null,
    createdBy: context.userId,
  };

  const newTaskId = await createTask(targetProjectId, newTaskData);

  // Copy attachments if requested
  let copiedAttachments = 0;
  if (includeAttachments) {
    const attachments = await getTaskAttachments(sourceProjectId, taskId);
    for (const attachment of attachments) {
      await createAttachment(targetProjectId, newTaskId, {
        name: attachment.name,
        url: attachment.url, // Reference same file URL
        type: attachment.type,
        size: attachment.size,
        uploadedBy: context.userId,
      });
      copiedAttachments++;
    }
  }

  return {
    success: true,
    sourceTaskId: taskId,
    newTaskId,
    sourceProjectName: sourceProject?.name || sourceProjectId,
    targetProjectName: targetProject.name,
    targetListName: selectedList.name,
    copiedAttachments,
    title: sourceTask.title,
  };
};
