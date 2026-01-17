import { getTool, ToolCall, ToolResult, ToolExecutionContext } from './tools';

/**
 * Execute a single tool call
 */
export async function executeTool(
  toolCall: ToolCall,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const tool = getTool(toolCall.name);

  if (!tool) {
    return {
      toolCallId: toolCall.id,
      success: false,
      error: `Unknown tool: ${toolCall.name}`,
    };
  }

  try {
    const result = await tool.handler(toolCall.arguments, context);
    return {
      toolCallId: toolCall.id,
      success: true,
      result,
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute multiple tool calls
 */
export async function executeTools(
  toolCalls: ToolCall[],
  context: ToolExecutionContext
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeTool(toolCall, context);
    results.push(result);
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
 * Check if tool calls require user confirmation
 */
export function requiresConfirmation(toolCalls: ToolCall[]): boolean {
  // All task-related tools require confirmation
  const confirmationRequired = ['create_task', 'create_tasks', 'update_task', 'delete_task'];
  return toolCalls.some((call) => confirmationRequired.includes(call.name));
}

/**
 * Get human-readable description of tool calls for confirmation dialog
 */
export function getToolCallsDescription(toolCalls: ToolCall[]): string[] {
  return toolCalls.map((call) => {
    switch (call.name) {
      case 'create_task': {
        const args = call.arguments as { title: string; priority?: string };
        return `タスク「${args.title}」を作成${args.priority ? `（優先度: ${args.priority}）` : ''}`;
      }
      case 'create_tasks': {
        const args = call.arguments as { tasks: Array<{ title: string }> };
        return `${args.tasks.length}件のタスクを作成:\n${args.tasks
          .map((t) => `  - ${t.title}`)
          .join('\n')}`;
      }
      default:
        return `${call.name} を実行`;
    }
  });
}
