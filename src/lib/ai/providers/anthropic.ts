import { AIContext, AIMessage, DEFAULT_MODELS } from '@/types/ai';
import { AIProvider, StreamChunk, SendMessageOptions } from './types';
import { getAnthropicTools } from '../tools';
import { ToolCall } from '../tools/types';

export class AnthropicProvider implements AIProvider {
  name = 'anthropic' as const;

  async *sendMessage(
    messages: AIMessage[],
    context: AIContext,
    apiKey: string,
    model?: string,
    options?: SendMessageOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const systemPrompt = buildSystemPrompt(context, options?.enableTools);
    const modelToUse = model || DEFAULT_MODELS.anthropic;

    const requestBody: Record<string, unknown> = {
      model: modelToUse,
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      stream: true,
    };

    // Add tools if enabled
    if (options?.enableTools) {
      requestBody.tools = getAnthropicTools();
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    const toolCalls: ToolCall[] = [];
    let currentToolUse: { id: string; name: string; input: string } | null = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((line) => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);

              // Handle text content
              if (parsed.type === 'content_block_delta') {
                if (parsed.delta?.type === 'text_delta') {
                  const text = parsed.delta?.text;
                  if (text) {
                    yield { type: 'text', content: text };
                  }
                } else if (parsed.delta?.type === 'input_json_delta') {
                  // Accumulate tool input
                  if (currentToolUse) {
                    currentToolUse.input += parsed.delta.partial_json || '';
                  }
                }
              }

              // Handle tool use start
              if (parsed.type === 'content_block_start') {
                if (parsed.content_block?.type === 'tool_use') {
                  currentToolUse = {
                    id: parsed.content_block.id,
                    name: parsed.content_block.name,
                    input: '',
                  };
                }
              }

              // Handle tool use end
              if (parsed.type === 'content_block_stop' && currentToolUse) {
                try {
                  toolCalls.push({
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    arguments: JSON.parse(currentToolUse.input || '{}'),
                  });
                } catch {
                  // Skip invalid JSON
                }
                currentToolUse = null;
              }

              // Handle message end
              if (parsed.type === 'message_stop') {
                if (toolCalls.length > 0) {
                  yield { type: 'tool_calls', toolCalls };
                }
                yield { type: 'done' };
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
