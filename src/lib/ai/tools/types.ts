/**
 * AI Tool definitions for Function Calling
 */

// JSON Schema types for tool parameters
export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
}

export interface JSONSchema {
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
}

/**
 * Tool definition interface
 */
export interface AITool {
  name: string;
  description: string;
  parameters: JSONSchema;
}

/**
 * Tool call from AI response
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  toolCallId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  projectId: string;
  userId: string;
  listId?: string; // Default list for task creation
}

/**
 * Tool handler function type
 */
export type ToolHandler<TArgs = Record<string, unknown>, TResult = unknown> = (
  args: TArgs,
  context: ToolExecutionContext
) => Promise<TResult>;

/**
 * Registered tool with handler
 */
export interface RegisteredTool {
  definition: AITool;
  handler: ToolHandler;
}

// Create task tool argument types
export interface CreateTaskArgs {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  dueDate?: string; // ISO 8601 format
}

export interface CreateTaskResult {
  taskId: string;
  title: string;
  success: boolean;
}

// Multiple tasks creation
export interface CreateTasksArgs {
  tasks: CreateTaskArgs[];
}

export interface CreateTasksResult {
  tasks: CreateTaskResult[];
  totalCreated: number;
}
