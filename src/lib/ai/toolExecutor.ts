import { getUnifiedTool } from './tools';
import { ToolCall, ToolResult, ToolExecutionContext } from './tools/types';

/**
 * Execute tool calls using the unified registry.
 * Handles both project-scope and personal-scope tools.
 * Project-scope tools require a valid projectId in context.
 */
export async function executeUnifiedTools(
  toolCalls: ToolCall[],
  context: ToolExecutionContext
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    const tool = getUnifiedTool(toolCall.name);

    if (!tool) {
      results.push({
        toolCallId: toolCall.id,
        success: false,
        error: `Unknown tool: ${toolCall.name}`,
      });
      continue;
    }

    // Safety check: project-scope tools require a valid projectId
    if (tool.scope === 'project' && !context.projectId) {
      results.push({
        toolCallId: toolCall.id,
        success: false,
        error: `Tool "${toolCall.name}" requires a project context but no projectId was provided.`,
      });
      continue;
    }

    try {
      const result = await tool.handler(toolCall.arguments, context);
      results.push({
        toolCallId: toolCall.id,
        success: true,
        result,
      });
    } catch (error) {
      results.push({
        toolCallId: toolCall.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Format tool results for AI response
 */
export function formatToolResultsForAI(results: ToolResult[]): string {
  return results
    .map((result) => {
      if (result.success) {
        return `ツール実行成功: ${JSON.stringify(result.result, null, 2)}`;
      } else {
        return `ツール実行失敗: ${result.error}`;
      }
    })
    .join('\n');
}

/**
 * Tools that require user confirmation before execution
 * Read-only tools (get_*) and simple write operations do not require confirmation
 * Only destructive operations (delete) require confirmation
 */
const TOOLS_REQUIRING_CONFIRMATION = [
  'delete_task',
];

/**
 * Check if tool calls require user confirmation
 */
export function requiresConfirmation(toolCalls: ToolCall[]): boolean {
  return toolCalls.some((call) => TOOLS_REQUIRING_CONFIRMATION.includes(call.name));
}

/**
 * Get human-readable description of tool calls for confirmation dialog
 */
export function getToolCallsDescription(toolCalls: ToolCall[]): string[] {
  return toolCalls.map((call) => {
    switch (call.name) {
      case 'create_task': {
        const args = call.arguments as { title: string; priority?: string; dueDate?: string };
        let desc = `タスク「${args.title}」を作成`;
        if (args.priority) desc += `（優先度: ${args.priority}）`;
        if (args.dueDate) desc += `（期限: ${args.dueDate}）`;
        return desc;
      }
      case 'create_tasks': {
        const args = call.arguments as { tasks: Array<{ title: string }> };
        return `${args.tasks.length}件のタスクを作成:\n${args.tasks
          .map((t) => `  - ${t.title}`)
          .join('\n')}`;
      }
      case 'update_task': {
        const args = call.arguments as {
          taskId: string;
          title?: string;
          description?: string;
          priority?: string;
          dueDate?: string;
          isCompleted?: boolean;
        };
        const updates: string[] = [];
        if (args.title) updates.push(`タイトル→「${args.title}」`);
        if (args.description !== undefined) updates.push('説明を更新');
        if (args.priority) updates.push(`優先度→${args.priority}`);
        if (args.dueDate) updates.push(`期限→${args.dueDate}`);
        if (args.isCompleted !== undefined) updates.push(args.isCompleted ? '完了にする' : '未完了に戻す');
        return `タスクを更新: ${updates.join(', ')}`;
      }
      case 'delete_task': {
        return `タスクを削除`;
      }
      case 'complete_task': {
        const args = call.arguments as { taskId: string; isCompleted: boolean };
        return args.isCompleted ? 'タスクを完了にする' : 'タスクを未完了に戻す';
      }
      case 'move_task': {
        return `タスクを別のリストに移動`;
      }
      case 'assign_task': {
        const args = call.arguments as { taskId: string; assigneeIds: string[] };
        if (args.assigneeIds.length === 0) {
          return `タスクの担当者をクリア`;
        }
        return `タスクに${args.assigneeIds.length}人の担当者を設定`;
      }
      // Read-only tools (no confirmation needed, but include for completeness)
      case 'get_tasks':
        return `タスク一覧を取得`;
      case 'get_task_details':
        return `タスクの詳細を取得`;
      case 'get_project_summary':
        return `プロジェクトの概要を取得`;
      case 'get_my_tasks':
        return `自分のタスクを取得`;
      case 'get_overdue_tasks':
        return `期限切れタスクを取得`;
      case 'get_lists':
        return `リスト一覧を取得`;
      case 'get_members':
        return `メンバー一覧を取得`;
      case 'get_labels':
        return `ラベル一覧を取得`;
      default:
        return `${call.name} を実行`;
    }
  });
}
