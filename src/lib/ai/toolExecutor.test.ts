import { describe, it, expect } from 'vitest';
import {
  formatToolResultsForAI,
  requiresConfirmation,
  getToolCallsDescription,
} from './toolExecutor';
import type { ToolCall, ToolResult } from './tools';

describe('formatToolResultsForAI', () => {
  it('should format successful results', () => {
    const results: ToolResult[] = [
      { toolCallId: '1', success: true, result: { taskId: 'task-1', title: 'New Task' } },
    ];
    const output = formatToolResultsForAI(results);
    expect(output).toContain('ツール実行成功');
    expect(output).toContain('task-1');
    expect(output).toContain('New Task');
  });

  it('should format failed results', () => {
    const results: ToolResult[] = [
      { toolCallId: '1', success: false, error: 'Task not found' },
    ];
    const output = formatToolResultsForAI(results);
    expect(output).toContain('ツール実行失敗');
    expect(output).toContain('Task not found');
  });

  it('should format mixed results', () => {
    const results: ToolResult[] = [
      { toolCallId: '1', success: true, result: { count: 5 } },
      { toolCallId: '2', success: false, error: 'Permission denied' },
    ];
    const output = formatToolResultsForAI(results);
    expect(output).toContain('ツール実行成功');
    expect(output).toContain('count');
    expect(output).toContain('ツール実行失敗');
    expect(output).toContain('Permission denied');
  });

  it('should handle empty results array', () => {
    expect(formatToolResultsForAI([])).toBe('');
  });
});

describe('requiresConfirmation', () => {
  it('should require confirmation for delete_task', () => {
    const toolCalls: ToolCall[] = [
      { id: '1', name: 'delete_task', arguments: { taskId: 'task-1' } },
    ];
    expect(requiresConfirmation(toolCalls)).toBe(true);
  });

  it('should not require confirmation for read-only tools', () => {
    const toolCalls: ToolCall[] = [
      { id: '1', name: 'get_tasks', arguments: {} },
      { id: '2', name: 'get_project_summary', arguments: {} },
    ];
    expect(requiresConfirmation(toolCalls)).toBe(false);
  });

  it('should not require confirmation for create/update tools', () => {
    const toolCalls: ToolCall[] = [
      { id: '1', name: 'create_task', arguments: { title: 'New' } },
      { id: '2', name: 'update_task', arguments: { taskId: '1' } },
    ];
    expect(requiresConfirmation(toolCalls)).toBe(false);
  });

  it('should return true if any tool requires confirmation', () => {
    const toolCalls: ToolCall[] = [
      { id: '1', name: 'get_tasks', arguments: {} },
      { id: '2', name: 'delete_task', arguments: { taskId: 'task-1' } },
    ];
    expect(requiresConfirmation(toolCalls)).toBe(true);
  });

  it('should handle empty array', () => {
    expect(requiresConfirmation([])).toBe(false);
  });
});

describe('getToolCallsDescription', () => {
  it('should describe create_task', () => {
    const calls: ToolCall[] = [
      { id: '1', name: 'create_task', arguments: { title: 'テストタスク' } },
    ];
    const descriptions = getToolCallsDescription(calls);
    expect(descriptions[0]).toContain('テストタスク');
    expect(descriptions[0]).toContain('作成');
  });

  it('should describe create_task with priority and due date', () => {
    const calls: ToolCall[] = [
      {
        id: '1',
        name: 'create_task',
        arguments: { title: 'Task', priority: 'high', dueDate: '2024-12-31' },
      },
    ];
    const descriptions = getToolCallsDescription(calls);
    expect(descriptions[0]).toContain('high');
    expect(descriptions[0]).toContain('2024-12-31');
  });

  it('should describe create_tasks with count', () => {
    const calls: ToolCall[] = [
      {
        id: '1',
        name: 'create_tasks',
        arguments: {
          tasks: [{ title: 'Task 1' }, { title: 'Task 2' }, { title: 'Task 3' }],
        },
      },
    ];
    const descriptions = getToolCallsDescription(calls);
    expect(descriptions[0]).toContain('3件');
    expect(descriptions[0]).toContain('Task 1');
    expect(descriptions[0]).toContain('Task 2');
    expect(descriptions[0]).toContain('Task 3');
  });

  it('should describe delete_task', () => {
    const calls: ToolCall[] = [
      { id: '1', name: 'delete_task', arguments: { taskId: 'task-1' } },
    ];
    const descriptions = getToolCallsDescription(calls);
    expect(descriptions[0]).toContain('削除');
  });

  it('should describe complete_task', () => {
    const calls: ToolCall[] = [
      { id: '1', name: 'complete_task', arguments: { taskId: 't-1', isCompleted: true } },
    ];
    expect(getToolCallsDescription(calls)[0]).toContain('完了');
  });

  it('should describe uncomplete_task', () => {
    const calls: ToolCall[] = [
      { id: '1', name: 'complete_task', arguments: { taskId: 't-1', isCompleted: false } },
    ];
    expect(getToolCallsDescription(calls)[0]).toContain('未完了');
  });

  it('should describe move_task', () => {
    const calls: ToolCall[] = [
      { id: '1', name: 'move_task', arguments: { taskId: 't-1', listId: 'l-2' } },
    ];
    expect(getToolCallsDescription(calls)[0]).toContain('移動');
  });

  it('should describe assign_task with assignees', () => {
    const calls: ToolCall[] = [
      {
        id: '1',
        name: 'assign_task',
        arguments: { taskId: 't-1', assigneeIds: ['u-1', 'u-2'] },
      },
    ];
    expect(getToolCallsDescription(calls)[0]).toContain('2人');
  });

  it('should describe assign_task clearing assignees', () => {
    const calls: ToolCall[] = [
      { id: '1', name: 'assign_task', arguments: { taskId: 't-1', assigneeIds: [] } },
    ];
    expect(getToolCallsDescription(calls)[0]).toContain('クリア');
  });

  it('should describe update_task with multiple fields', () => {
    const calls: ToolCall[] = [
      {
        id: '1',
        name: 'update_task',
        arguments: { taskId: 't-1', title: 'New Title', priority: 'high' },
      },
    ];
    const desc = getToolCallsDescription(calls)[0];
    expect(desc).toContain('New Title');
    expect(desc).toContain('high');
  });

  it('should describe unknown tools', () => {
    const calls: ToolCall[] = [
      { id: '1', name: 'unknown_tool', arguments: {} },
    ];
    expect(getToolCallsDescription(calls)[0]).toContain('unknown_tool');
  });

  it('should describe read-only tools', () => {
    const readOnlyTools = [
      'get_tasks',
      'get_task_details',
      'get_project_summary',
      'get_my_tasks',
      'get_overdue_tasks',
      'get_lists',
      'get_members',
      'get_labels',
    ];
    for (const toolName of readOnlyTools) {
      const calls: ToolCall[] = [{ id: '1', name: toolName, arguments: {} }];
      const desc = getToolCallsDescription(calls)[0];
      expect(desc).toBeTruthy();
      expect(desc.length).toBeGreaterThan(0);
    }
  });
});
