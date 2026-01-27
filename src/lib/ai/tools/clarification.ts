/**
 * Clarification utilities for AI tools
 * Provides interactive field completion patterns
 */

/**
 * Type of clarification needed
 */
export type ClarificationType = 'missing_field' | 'ambiguous_input' | 'recommendation';

/**
 * A single clarification request
 */
export interface ClarificationRequest {
  type: ClarificationType;
  field: string;
  message: string;
  options?: string[];
  required: boolean;
}

/**
 * Result of checking for required fields
 */
export interface ClarificationResult {
  needsClarification: boolean;
  clarifications: ClarificationRequest[];
}

/**
 * Context for field checking
 */
export interface FieldCheckContext {
  hasListIdInContext: boolean;
  hasProjectMembers: boolean;
}

/**
 * Arguments for create_task that need to be checked
 */
export interface CreateTaskFieldsToCheck {
  title?: string;
  listId?: string;
  startDate?: string;
  dueDate?: string;
  durationDays?: number;
  assigneeIds?: string[];
  dependsOnTaskIds?: string[];
}

/**
 * Check required fields for task creation
 *
 * @param args The task creation arguments
 * @param context Context information about available data
 * @returns ClarificationResult with any needed clarifications
 */
export function checkRequiredFieldsForCreate(
  args: CreateTaskFieldsToCheck,
  context: FieldCheckContext
): ClarificationResult {
  const clarifications: ClarificationRequest[] = [];

  // Check title (always required)
  if (!args.title || args.title.trim() === '') {
    clarifications.push({
      type: 'missing_field',
      field: 'title',
      message: 'タスクのタイトルを入力してください。',
      required: true,
    });
  }

  // Check listId (required if not in context)
  if (!args.listId && !context.hasListIdInContext) {
    clarifications.push({
      type: 'missing_field',
      field: 'listId',
      message: 'タスクを追加するリストを指定してください。get_listsで利用可能なリストを確認できます。',
      required: true,
    });
  }

  // Recommend date information if none provided
  const hasDateInfo = args.startDate || args.dueDate || args.durationDays;
  if (!hasDateInfo) {
    clarifications.push({
      type: 'recommendation',
      field: 'dates',
      message: '日程情報（開始日、期限、または所要日数）を指定すると、ガントチャートでスケジュール管理ができます。指定しますか？',
      options: ['開始日と所要日数を指定', '期限のみ指定', '後で設定する'],
      required: false,
    });
  }

  // Recommend assignees if members exist but not assigned
  if (!args.assigneeIds || args.assigneeIds.length === 0) {
    if (context.hasProjectMembers) {
      clarifications.push({
        type: 'recommendation',
        field: 'assigneeIds',
        message: '担当者を割り当てますか？get_membersでプロジェクトメンバーを確認できます。',
        options: ['担当者を割り当てる', 'スキップ'],
        required: false,
      });
    }
  }

  return {
    needsClarification: clarifications.some((c) => c.required),
    clarifications,
  };
}

/**
 * Arguments for update_task that need to be checked
 */
export interface UpdateTaskFieldsToCheck {
  taskId?: string;
}

/**
 * Check required fields for task update
 *
 * @param args The task update arguments
 * @returns ClarificationResult with any needed clarifications
 */
export function checkRequiredFieldsForUpdate(
  args: UpdateTaskFieldsToCheck
): ClarificationResult {
  const clarifications: ClarificationRequest[] = [];

  // Check taskId (always required)
  if (!args.taskId) {
    clarifications.push({
      type: 'missing_field',
      field: 'taskId',
      message: '更新するタスクのIDを指定してください。get_tasksでタスク一覧を確認できます。',
      required: true,
    });
  }

  return {
    needsClarification: clarifications.some((c) => c.required),
    clarifications,
  };
}

/**
 * Format clarification results for AI response
 *
 * @param result The clarification result
 * @returns Formatted string for AI to present to user
 */
export function formatClarificationMessage(result: ClarificationResult): string {
  if (!result.needsClarification && result.clarifications.length === 0) {
    return '';
  }

  const parts: string[] = [];

  // Required clarifications first
  const required = result.clarifications.filter((c) => c.required);
  if (required.length > 0) {
    parts.push('以下の情報が必要です：');
    for (const c of required) {
      parts.push(`- ${c.message}`);
    }
  }

  // Optional recommendations
  const recommendations = result.clarifications.filter((c) => !c.required);
  if (recommendations.length > 0 && parts.length > 0) {
    parts.push('');
    parts.push('また、以下の設定も推奨されます：');
    for (const c of recommendations) {
      parts.push(`- ${c.message}`);
      if (c.options) {
        parts.push(`  選択肢: ${c.options.join(' / ')}`);
      }
    }
  } else if (recommendations.length > 0) {
    parts.push('以下の設定が推奨されます：');
    for (const c of recommendations) {
      parts.push(`- ${c.message}`);
      if (c.options) {
        parts.push(`  選択肢: ${c.options.join(' / ')}`);
      }
    }
  }

  return parts.join('\n');
}

/**
 * Create a clarification response for tool handlers
 *
 * @param clarifications The clarification requests
 * @returns Object suitable for returning from a tool handler
 */
export function createClarificationResponse(clarifications: ClarificationRequest[]): {
  needsClarification: true;
  clarifications: ClarificationRequest[];
  message: string;
} {
  return {
    needsClarification: true,
    clarifications,
    message: formatClarificationMessage({
      needsClarification: true,
      clarifications,
    }),
  };
}
