import { createTask } from '@/lib/firebase/firestore';
import {
  AITool,
  ToolHandler,
  CreateTaskArgs,
  CreateTaskResult,
  CreateTasksArgs,
  CreateTasksResult,
  ToolExecutionContext,
} from './types';

/**
 * create_task tool definition
 */
export const createTaskToolDefinition: AITool = {
  name: 'create_task',
  description:
    'プロジェクトに新しいタスクを作成します。ユーザーが「〜したい」「〜する必要がある」などと言った場合に使用してください。',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'タスクのタイトル（必須）',
      },
      description: {
        type: 'string',
        description: 'タスクの詳細説明',
      },
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: '優先度（high=高, medium=中, low=低）',
      },
      dueDate: {
        type: 'string',
        description: '期限（ISO 8601形式、例: 2024-01-20）',
      },
    },
    required: ['title'],
  },
};

/**
 * create_tasks tool definition (for multiple tasks)
 */
export const createTasksToolDefinition: AITool = {
  name: 'create_tasks',
  description:
    '複数のタスクを一度に作成します。ユーザーが複数のタスクを作成したい場合に使用してください。',
  parameters: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        description: '作成するタスクの配列',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'タスクのタイトル（必須）',
            },
            description: {
              type: 'string',
              description: 'タスクの詳細説明',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: '優先度',
            },
            dueDate: {
              type: 'string',
              description: '期限（ISO 8601形式）',
            },
          },
          required: ['title'],
        },
      },
    },
    required: ['tasks'],
  },
};

/**
 * create_task handler
 */
export const createTaskHandler: ToolHandler<CreateTaskArgs, CreateTaskResult> = async (
  args,
  context
) => {
  const { title, description, priority, dueDate } = args;
  const { projectId, userId, listId } = context;

  if (!listId) {
    throw new Error('listId is required for task creation');
  }

  const taskId = await createTask(projectId, {
    listId,
    title,
    description: description || '',
    order: Date.now(), // Use timestamp for ordering new tasks at the end
    assigneeIds: [],
    labelIds: [],
    tagIds: [],
    dependsOnTaskIds: [],
    priority: priority || null,
    startDate: null,
    dueDate: dueDate ? new Date(dueDate) : null,
    isCompleted: false,
    completedAt: null,
    isAbandoned: false,
    createdBy: userId,
  });

  return {
    taskId,
    title,
    success: true,
  };
};

/**
 * create_tasks handler (multiple tasks)
 */
export const createTasksHandler: ToolHandler<CreateTasksArgs, CreateTasksResult> = async (
  args,
  context
) => {
  const { tasks } = args;
  const results: CreateTaskResult[] = [];

  for (const taskArgs of tasks) {
    try {
      const result = await createTaskHandler(taskArgs, context);
      results.push(result);
    } catch (error) {
      results.push({
        taskId: '',
        title: taskArgs.title,
        success: false,
      });
    }
  }

  return {
    tasks: results,
    totalCreated: results.filter((r) => r.success).length,
  };
};
