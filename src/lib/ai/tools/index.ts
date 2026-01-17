import { AITool, RegisteredTool, ToolHandler } from './types';
import {
  createTaskToolDefinition,
  createTasksToolDefinition,
  createTaskHandler,
  createTasksHandler,
} from './createTask';

/**
 * Registry of all available AI tools
 */
export const toolRegistry: Map<string, RegisteredTool> = new Map();

// Register tools
toolRegistry.set('create_task', {
  definition: createTaskToolDefinition,
  handler: createTaskHandler as unknown as ToolHandler,
});

toolRegistry.set('create_tasks', {
  definition: createTasksToolDefinition,
  handler: createTasksHandler as unknown as ToolHandler,
});

/**
 * Get all tool definitions for AI API
 */
export function getAllToolDefinitions(): AITool[] {
  return Array.from(toolRegistry.values()).map((tool) => tool.definition);
}

/**
 * Get a specific tool by name
 */
export function getTool(name: string): RegisteredTool | undefined {
  return toolRegistry.get(name);
}

/**
 * Get tool definitions formatted for OpenAI API
 */
export function getOpenAITools(): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}> {
  return getAllToolDefinitions().map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * Get tool definitions formatted for Anthropic API
 */
export function getAnthropicTools(): Array<{
  name: string;
  description: string;
  input_schema: object;
}> {
  return getAllToolDefinitions().map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/**
 * Get tool definitions formatted for Gemini API
 */
export function getGeminiTools(): Array<{
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: object;
  }>;
}> {
  return [
    {
      functionDeclarations: getAllToolDefinitions().map((tool) => ({
        name: tool.name,
        description: tool.description,
        parameters: convertToGeminiSchema(tool.parameters),
      })),
    },
  ];
}

/**
 * Convert JSON Schema to Gemini format
 */
function convertToGeminiSchema(schema: object): object {
  // Gemini uses uppercase types
  return JSON.parse(
    JSON.stringify(schema).replace(/"type":\s*"(\w+)"/g, (_, type) => {
      return `"type":"${type.toUpperCase()}"`;
    })
  );
}

// Re-export types
export * from './types';
