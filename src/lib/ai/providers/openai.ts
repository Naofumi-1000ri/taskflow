import { AIContext, AIMessage, DEFAULT_MODELS } from '@/types/ai';
import { AIProvider, StreamChunk, SendMessageOptions } from './types';
import { getOpenAITools } from '../tools';
import { ToolCall } from '../tools/types';

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;

  async *sendMessage(
    messages: AIMessage[],
    context: AIContext,
    apiKey: string,
    model?: string,
    options?: SendMessageOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const systemPrompt = buildSystemPrompt(context, options?.enableTools);
    const modelToUse = model || DEFAULT_MODELS.openai;

    const requestBody: Record<string, unknown> = {
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      stream: true,
    };

    // Add tools if enabled
    if (options?.enableTools) {
      requestBody.tools = getOpenAITools();
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    const toolCallsInProgress: Map<number, { id: string; name: string; arguments: string }> =
      new Map();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Check if there are any tool calls to emit
              if (toolCallsInProgress.size > 0) {
                const toolCalls: ToolCall[] = Array.from(toolCallsInProgress.values()).map(
                  (tc) => ({
                    id: tc.id,
                    name: tc.name,
                    arguments: JSON.parse(tc.arguments || '{}'),
                  })
                );
                yield { type: 'tool_calls', toolCalls };
              }
              yield { type: 'done' };
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;

              // Handle text content
              if (delta?.content) {
                yield { type: 'text', content: delta.content };
              }

              // Handle tool calls
              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  const index = toolCall.index;
                  if (!toolCallsInProgress.has(index)) {
                    toolCallsInProgress.set(index, {
                      id: toolCall.id || '',
                      name: toolCall.function?.name || '',
                      arguments: toolCall.function?.arguments || '',
                    });
                  } else {
                    const existing = toolCallsInProgress.get(index)!;
                    if (toolCall.id) existing.id = toolCall.id;
                    if (toolCall.function?.name) existing.name = toolCall.function.name;
                    if (toolCall.function?.arguments) {
                      existing.arguments += toolCall.function.arguments;
                    }
                  }
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}

function buildSystemPrompt(context: AIContext, enableTools?: boolean): string {
  let prompt = `あなたはタスク管理アプリ「TaskFlow」のサポートAIアシスタントです。
ユーザーのタスク管理や質問に対して、親切で的確なサポートを提供してください。

## 現在のコンテキスト

### ユーザー情報
- 名前: ${context.user.displayName}

### プロジェクト情報
- プロジェクト名: ${context.project.name}
- 説明: ${context.project.description || 'なし'}
- リスト: ${context.project.lists.map((l) => `${l.name}(${l.taskCount}件)`).join(', ')}
- メンバー: ${context.project.members.map((m) => m.displayName).join(', ')}
`;

  if (context.task) {
    prompt += `
### 現在選択中のタスク
- タイトル: ${context.task.title}
- 説明: ${context.task.description || 'なし'}
- 優先度: ${context.task.priority || '未設定'}
- 期限: ${context.task.dueDate ? new Date(context.task.dueDate).toLocaleDateString('ja-JP') : '未設定'}
- ステータス: ${context.task.status}
- 担当者: ${context.task.assignees.join(', ') || '未割り当て'}
`;

    if (context.task.checklists.length > 0) {
      prompt += `- チェックリスト:\n`;
      for (const checklist of context.task.checklists) {
        prompt += `  - ${checklist.title}:\n`;
        for (const item of checklist.items) {
          prompt += `    - [${item.isChecked ? 'x' : ' '}] ${item.text}\n`;
        }
      }
    }

    if (context.task.comments.length > 0) {
      prompt += `- 最近のコメント:\n`;
      for (const comment of context.task.comments.slice(-3)) {
        prompt += `  - ${comment.authorName}: ${comment.content}\n`;
      }
    }
  }

  prompt += `
## 回答のガイドライン
- 日本語で回答してください
- 簡潔で分かりやすい回答を心がけてください
- タスク管理に関するアドバイスを提供してください
- 必要に応じてタスクの分解や優先順位付けの提案をしてください
`;

  if (enableTools) {
    prompt += `
## ツールの使用
ユーザーが「〜したい」「〜を作成して」などと言った場合は、create_taskまたはcreate_tasksツールを使用してタスクを作成してください。
複数のタスクを作成する場合はcreate_tasksを使用してください。
`;
  }

  return prompt;
}
