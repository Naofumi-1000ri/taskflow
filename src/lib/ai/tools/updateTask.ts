import { updateTask, getProjectTasks, getTask } from '@/lib/firebase/firestore';
import { AITool, ToolHandler } from './types';
import { validateTask } from './validation';
import { recalculateDates } from '@/lib/utils/task';

// Update task argument types
export interface UpdateTaskArgs {
  taskId: string;
  title?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  startDate?: string;
  dueDate?: string;
  durationDays?: number;
  isDueDateFixed?: boolean;
  dependsOnTaskIds?: string[];
  isCompleted?: boolean;
}

export interface UpdateTaskResult {
  taskId: string;
  updated: string[];
  success: boolean;
  warnings?: string[];
}

/**
 * update_task tool definition
 */
export const updateTaskToolDefinition: AITool = {
  name: 'update_task',
  description:
    'タスクの情報を更新します。タイトル、説明、優先度、日程、依存関係、完了状態を変更できます。',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: '更新するタスクのID（必須）',
      },
      title: {
        type: 'string',
        description: '新しいタスクタイトル',
      },
      description: {
        type: 'string',
        description: '新しい説明文',
      },
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: '優先度（high=高, medium=中, low=低）',
      },
      startDate: {
        type: 'string',
        description: '開始日（ISO 8601形式、例: 2024-01-20）。nullで開始日を削除。',
      },
      dueDate: {
        type: 'string',
        description: '期限（ISO 8601形式、例: 2024-01-20）。nullで期限を削除。期限を直接変更するとisDueDateFixedがtrueになります。',
      },
      durationDays: {
        type: 'number',
        description: '所要日数。変更するとisDueDateFixedがfalseになり、期限が自動計算されます。',
      },
      isDueDateFixed: {
        type: 'boolean',
        description: '期限固定フラグ。true=期限固定（開始日変更時もdurationが変わる）、false=duration優先（開始日変更時は期限も移動）。',
      },
      dependsOnTaskIds: {
        type: 'array',
        items: { type: 'string' },
        description: '依存タスクのID配列。既存の依存関係を上書きします。空配列で依存関係を削除。',
      },
      isCompleted: {
        type: 'boolean',
        description: '完了状態（true=完了, false=未完了）',
      },
    },
    required: ['taskId'],
  },
};

/**
 * update_task handler
 */
export const updateTaskHandler: ToolHandler<UpdateTaskArgs, UpdateTaskResult> = async (
  args,
  context
) => {
  const { taskId, title, description, priority, startDate, dueDate, durationDays, isDueDateFixed, dependsOnTaskIds, isCompleted } = args;
  const { projectId } = context;

  const warnings: string[] = [];

  // Fetch the existing task
  const existingTask = await getTask(projectId, taskId);
  if (!existingTask) {
    throw new Error('タスクが見つかりません');
  }

  // Fetch all tasks for validation if dependencies are being updated
  let allTasks: import('@/types').Task[] = [];
  if (dependsOnTaskIds !== undefined) {
    allTasks = await getProjectTasks(projectId);
  }

  // Validate the update
  const validation = validateTask({
    taskId,
    startDate: startDate !== undefined ? startDate : existingTask.startDate?.toISOString().split('T')[0],
    dueDate: dueDate !== undefined ? dueDate : existingTask.dueDate?.toISOString().split('T')[0],
    durationDays: durationDays !== undefined ? durationDays : existingTask.durationDays,
    isDueDateFixed: isDueDateFixed !== undefined ? isDueDateFixed : existingTask.isDueDateFixed,
    dependsOnTaskIds: dependsOnTaskIds !== undefined ? dependsOnTaskIds : existingTask.dependsOnTaskIds,
    allTasks,
  });

  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }
  warnings.push(...validation.warnings);

  const updateData: Record<string, unknown> = {};
  const updatedFields: string[] = [];

  if (title !== undefined) {
    updateData.title = title;
    updatedFields.push('title');
  }
  if (description !== undefined) {
    updateData.description = description;
    updatedFields.push('description');
  }
  if (priority !== undefined) {
    updateData.priority = priority;
    updatedFields.push('priority');
  }

  // Handle date fields with recalculation
  const hasDateChanges = startDate !== undefined || dueDate !== undefined || durationDays !== undefined || isDueDateFixed !== undefined;

  if (hasDateChanges) {
    const dateChanges: Parameters<typeof recalculateDates>[1] = {};

    if (startDate !== undefined) {
      dateChanges.startDate = startDate === 'null' || startDate === '' ? null : new Date(startDate);
    }
    if (dueDate !== undefined) {
      dateChanges.dueDate = dueDate === 'null' || dueDate === '' ? null : new Date(dueDate);
    }
    if (durationDays !== undefined) {
      dateChanges.durationDays = durationDays;
    }
    if (isDueDateFixed !== undefined) {
      dateChanges.isDueDateFixed = isDueDateFixed;
    }

    const recalculated = recalculateDates(existingTask, dateChanges);

    if (startDate !== undefined) {
      updateData.startDate = recalculated.startDate;
      updatedFields.push('startDate');
    }
    if (dueDate !== undefined || (durationDays !== undefined && !recalculated.isDueDateFixed)) {
      updateData.dueDate = recalculated.dueDate;
      if (!updatedFields.includes('dueDate')) {
        updatedFields.push('dueDate');
      }
    }
    if (durationDays !== undefined || (dueDate !== undefined && existingTask.startDate)) {
      updateData.durationDays = recalculated.durationDays;
      if (!updatedFields.includes('durationDays')) {
        updatedFields.push('durationDays');
      }
    }
    if (isDueDateFixed !== undefined || dueDate !== undefined || durationDays !== undefined) {
      updateData.isDueDateFixed = recalculated.isDueDateFixed;
      if (!updatedFields.includes('isDueDateFixed')) {
        updatedFields.push('isDueDateFixed');
      }
    }
  }

  if (dependsOnTaskIds !== undefined) {
    updateData.dependsOnTaskIds = dependsOnTaskIds;
    updatedFields.push('dependsOnTaskIds');
  }

  if (isCompleted !== undefined) {
    updateData.isCompleted = isCompleted;
    if (isCompleted) {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }
    updatedFields.push('isCompleted');
  }

  if (updatedFields.length === 0) {
    throw new Error('更新する項目が指定されていません');
  }

  await updateTask(projectId, taskId, updateData);

  return {
    taskId,
    updated: updatedFields,
    success: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};
