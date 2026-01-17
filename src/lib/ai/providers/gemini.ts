import { AIContext, AIMessage, DEFAULT_MODELS } from '@/types/ai';
import { AIProvider, StreamChunk, SendMessageOptions } from './types';
import { getGeminiTools } from '../tools';
import { ToolCall } from '../tools/types';

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;

  async *sendMessage(
    messages: AIMessage[],
    context: AIContext,
    apiKey: string,
    model?: string,
    options?: SendMessageOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const systemPrompt = buildSystemPrompt(context, options?.enableTools);
    const modelToUse = model || DEFAULT_MODELS.gemini;

    // Build contents array with system instruction as first user message
    const contents = [
      {
        role: 'user',
        parts: [{ text: systemPrompt }],
      },
      {
        role: 'model',
        parts: [{ text: 'わかりました。タスク管理のサポートをさせていただきます。' }],
      },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    ];

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    };

    // Add tools if enabled
    if (options?.enableTools) {
      requestBody.tools = getGeminiTools();
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:streamGenerateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    const toolCalls: ToolCall[] = [];

    console.log('[Gemini] Starting to read response stream...');

    try {
      // Collect all data from stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }

      console.log('[Gemini] Stream complete, buffer length:', buffer.length);

      // Gemini returns a JSON array like: [{...}, {...}]
      // Parse the entire response
      let responseArray;
      try {
        responseArray = JSON.parse(buffer);
      } catch (e) {
        console.error('[Gemini] Failed to parse response:', buffer.substring(0, 500));
        throw new Error('Failed to parse Gemini response');
      }

      if (!Array.isArray(responseArray)) {
        responseArray = [responseArray];
      }

      console.log('[Gemini] Parsed', responseArray.length, 'response chunks');

      // Process each response object
      for (const response of responseArray) {
        // Check for errors
        if (response.error) {
          console.error('[Gemini] API Error:', response.error);
          throw new Error(response.error.message || 'Gemini API error');
        }

        const candidate = response.candidates?.[0];
        if (candidate?.content?.parts) {
          for (const part of candidate.content.parts) {
            // Handle text content
            if (part.text) {
              console.log('[Gemini] Yielding text:', part.text.substring(0, 50));
              yield { type: 'text', content: part.text };
            }

            // Handle function calls
            if (part.functionCall) {
              console.log('[Gemini] Found function call:', part.functionCall.name);
              toolCalls.push({
                id: `gemini-${Date.now()}-${toolCalls.length}`,
                name: part.functionCall.name,
                arguments: part.functionCall.args || {},
              });
            }
          }
        }
      }

      // Emit tool calls if any
      if (toolCalls.length > 0) {
        yield { type: 'tool_calls', toolCalls };
      }
      yield { type: 'done' };
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
