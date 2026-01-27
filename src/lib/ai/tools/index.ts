import { AITool, RegisteredTool, ToolHandler } from './types';
import {
  createTaskToolDefinition,
  createTasksToolDefinition,
  createTaskHandler,
  createTasksHandler,
} from './createTask';
import {
  updateTaskToolDefinition,
  updateTaskHandler,
} from './updateTask';
import {
  deleteTaskToolDefinition,
  deleteTaskHandler,
} from './deleteTask';
import {
  completeTaskToolDefinition,
  completeTaskHandler,
  moveTaskToolDefinition,
  moveTaskHandler,
  assignTaskToolDefinition,
  assignTaskHandler,
} from './taskTools';
import {
  getTasksToolDefinition,
  getTasksHandler,
  getTaskDetailsToolDefinition,
  getTaskDetailsHandler,
  getProjectSummaryToolDefinition,
  getProjectSummaryHandler,
  getMyTasksToolDefinition,
  getMyTasksHandler,
  getOverdueTasksToolDefinition,
  getOverdueTasksHandler,
} from './queryTasks';
import {
  getListsToolDefinition,
  getListsHandler,
  getMembersToolDefinition,
  getMembersHandler,
  getLabelsToolDefinition,
  getLabelsHandler,
} from './projectQueries';
import {
  suggestScheduleChangesToolDefinition,
  suggestScheduleChangesHandler,
  notifyDependencyDelaysToolDefinition,
  notifyDependencyDelaysHandler,
} from './scheduleAnalysis';
import {
  generateTaskPlanToolDefinition,
  generateTaskPlanHandler,
  executeTaskPlanToolDefinition,
  executeTaskPlanHandler,
} from './planGeneration';
import {
  suggestImprovementsToolDefinition,
  suggestImprovementsHandler,
} from './qualityAssistance';
import {
  getMyTasksAcrossProjectsToolDefinition,
  getMyTasksAcrossProjectsHandler,
  getWorkloadSummaryToolDefinition,
  getWorkloadSummaryHandler,
  suggestWorkPriorityToolDefinition,
  suggestWorkPriorityHandler,
  generateDailyReportToolDefinition,
  generateDailyReportHandler,
} from './personalTools';

/**
 * Registry of all available AI tools
 */
export const toolRegistry: Map<string, RegisteredTool> = new Map();

// ============================================
// Task Creation Tools
// ============================================
toolRegistry.set('create_task', {
  definition: createTaskToolDefinition,
  handler: createTaskHandler as unknown as ToolHandler,
});

toolRegistry.set('create_tasks', {
  definition: createTasksToolDefinition,
  handler: createTasksHandler as unknown as ToolHandler,
});

// ============================================
// Task Modification Tools
// ============================================
toolRegistry.set('update_task', {
  definition: updateTaskToolDefinition,
  handler: updateTaskHandler as unknown as ToolHandler,
});

toolRegistry.set('delete_task', {
  definition: deleteTaskToolDefinition,
  handler: deleteTaskHandler as unknown as ToolHandler,
});

toolRegistry.set('complete_task', {
  definition: completeTaskToolDefinition,
  handler: completeTaskHandler as unknown as ToolHandler,
});

toolRegistry.set('move_task', {
  definition: moveTaskToolDefinition,
  handler: moveTaskHandler as unknown as ToolHandler,
});

toolRegistry.set('assign_task', {
  definition: assignTaskToolDefinition,
  handler: assignTaskHandler as unknown as ToolHandler,
});

// ============================================
// Query Tools (Read-only)
// ============================================
toolRegistry.set('get_tasks', {
  definition: getTasksToolDefinition,
  handler: getTasksHandler as unknown as ToolHandler,
});

toolRegistry.set('get_task_details', {
  definition: getTaskDetailsToolDefinition,
  handler: getTaskDetailsHandler as unknown as ToolHandler,
});

toolRegistry.set('get_project_summary', {
  definition: getProjectSummaryToolDefinition,
  handler: getProjectSummaryHandler as unknown as ToolHandler,
});

toolRegistry.set('get_my_tasks', {
  definition: getMyTasksToolDefinition,
  handler: getMyTasksHandler as unknown as ToolHandler,
});

toolRegistry.set('get_overdue_tasks', {
  definition: getOverdueTasksToolDefinition,
  handler: getOverdueTasksHandler as unknown as ToolHandler,
});

// ============================================
// Project Structure Query Tools (Read-only)
// ============================================
toolRegistry.set('get_lists', {
  definition: getListsToolDefinition,
  handler: getListsHandler as unknown as ToolHandler,
});

toolRegistry.set('get_members', {
  definition: getMembersToolDefinition,
  handler: getMembersHandler as unknown as ToolHandler,
});

toolRegistry.set('get_labels', {
  definition: getLabelsToolDefinition,
  handler: getLabelsHandler as unknown as ToolHandler,
});

// ============================================
// Schedule Analysis Tools
// ============================================
toolRegistry.set('suggest_schedule_changes', {
  definition: suggestScheduleChangesToolDefinition,
  handler: suggestScheduleChangesHandler as unknown as ToolHandler,
});

toolRegistry.set('notify_dependency_delays', {
  definition: notifyDependencyDelaysToolDefinition,
  handler: notifyDependencyDelaysHandler as unknown as ToolHandler,
});

// ============================================
// Plan Generation Tools
// ============================================
toolRegistry.set('generate_task_plan', {
  definition: generateTaskPlanToolDefinition,
  handler: generateTaskPlanHandler as unknown as ToolHandler,
});

toolRegistry.set('execute_task_plan', {
  definition: executeTaskPlanToolDefinition,
  handler: executeTaskPlanHandler as unknown as ToolHandler,
});

// ============================================
// Quality Assistance Tools
// ============================================
toolRegistry.set('suggest_improvements', {
  definition: suggestImprovementsToolDefinition,
  handler: suggestImprovementsHandler as unknown as ToolHandler,
});

// ============================================
// Personal AI Tools Registry (Cross-project)
// ============================================
export const personalToolRegistry: Map<string, RegisteredTool> = new Map();

personalToolRegistry.set('get_my_tasks_across_projects', {
  definition: getMyTasksAcrossProjectsToolDefinition,
  handler: getMyTasksAcrossProjectsHandler as unknown as ToolHandler,
});

personalToolRegistry.set('get_workload_summary', {
  definition: getWorkloadSummaryToolDefinition,
  handler: getWorkloadSummaryHandler as unknown as ToolHandler,
});

personalToolRegistry.set('suggest_work_priority', {
  definition: suggestWorkPriorityToolDefinition,
  handler: suggestWorkPriorityHandler as unknown as ToolHandler,
});

personalToolRegistry.set('generate_daily_report', {
  definition: generateDailyReportToolDefinition,
  handler: generateDailyReportHandler as unknown as ToolHandler,
});

/**
 * Get all tool definitions for AI API (project scope)
 */
export function getAllToolDefinitions(): AITool[] {
  return Array.from(toolRegistry.values()).map((tool) => tool.definition);
}

/**
 * Get all personal tool definitions for AI API
 */
export function getPersonalToolDefinitions(): AITool[] {
  return Array.from(personalToolRegistry.values()).map((tool) => tool.definition);
}

/**
 * Get a specific personal tool by name
 */
export function getPersonalTool(name: string): RegisteredTool | undefined {
  return personalToolRegistry.get(name);
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
export function getOpenAITools(isPersonalScope = false): Array<{
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}> {
  const tools = isPersonalScope ? getPersonalToolDefinitions() : getAllToolDefinitions();
  return tools.map((tool) => ({
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
export function getAnthropicTools(isPersonalScope = false): Array<{
  name: string;
  description: string;
  input_schema: object;
}> {
  const tools = isPersonalScope ? getPersonalToolDefinitions() : getAllToolDefinitions();
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

/**
 * Get tool definitions formatted for Gemini API
 */
export function getGeminiTools(isPersonalScope = false): Array<{
  functionDeclarations: Array<{
    name: string;
    description: string;
    parameters: object;
  }>;
}> {
  const tools = isPersonalScope ? getPersonalToolDefinitions() : getAllToolDefinitions();
  return [
    {
      functionDeclarations: tools.map((tool) => ({
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
