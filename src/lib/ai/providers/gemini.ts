import { AIContext, AIMessage, DEFAULT_MODELS } from '@/types/ai';
import { AIProvider, StreamChunk, SendMessageOptions } from './types';
import { getGeminiTools } from '../tools';
import { ToolCall } from '../tools/types';

/**
 * Convert AIMessage array to Gemini content format
 * Handles function calls (model) and function responses (user)
 */
function convertMessagesToGemini(messages: AIMessage[]): Array<{
  role: 'user' | 'model';
  parts: Array<Record<string, unknown>>;
}> {
  console.log('[Gemini] Converting messages, count:', messages.length);

  const result: Array<{
    role: 'user' | 'model';
    parts: Array<Record<string, unknown>>;
  }> = [];

  for (const msg of messages) {
    console.log('[Gemini] Processing message:', msg.role, 'hasToolCalls:', !!msg.toolCalls, 'thoughtSig:', msg.thoughtSignature);
    if (msg.role === 'assistant') {
      // Check if this is an assistant message with tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const parts: Array<Record<string, unknown>> = [];

        // Add text content if present
        if (msg.content) {
          parts.push({ text: msg.content });
        }

        // Add function call parts with thoughtSignature (required for Gemini 3)
        for (const toolCall of msg.toolCalls) {
          console.log('[Gemini] Building functionCall part:', toolCall.name, 'thoughtSig:', toolCall.thoughtSignature);
          const functionCallPart: Record<string, unknown> = {
            functionCall: {
              name: toolCall.name,
              args: toolCall.arguments,
            },
          };
          // Gemini 3: thoughtSignature must be a SIBLING of functionCall, not inside it
          if (toolCall.thoughtSignature) {
            functionCallPart.thoughtSignature = toolCall.thoughtSignature;
          }
          console.log('[Gemini] Built functionCall part:', JSON.stringify(functionCallPart));
          parts.push(functionCallPart);
        }

        result.push({
          role: 'model',
          parts,
        });
      } else {
        // Regular text-only assistant message
        result.push({
          role: 'model',
          parts: [{ text: msg.content }],
        });
      }
    } else if (msg.role === 'tool') {
      // Tool result message - becomes a user message with functionResponse
      // Parse the content as it's stored as JSON string
      let responseData: unknown;
      try {
        responseData = JSON.parse(msg.content);
      } catch {
        responseData = { result: msg.content };
      }

      console.log('[Gemini] Building functionResponse part:', msg.toolName);
      // Note: thoughtSignature stays with the model's functionCall, not in functionResponse
      const functionResponsePart: Record<string, unknown> = {
        functionResponse: {
          name: msg.toolName || msg.toolCallId || 'unknown', // Gemini needs the function name
          response: responseData,
        },
      };
      console.log('[Gemini] Built functionResponse part:', JSON.stringify(functionResponsePart));

      result.push({
        role: 'user',
        parts: [functionResponsePart],
      });
    } else {
      // User message
      result.push({
        role: 'user',
        parts: [{ text: msg.content }],
      });
    }
  }

  return result;
}

export class GeminiProvider implements AIProvider {
  name = 'gemini' as const;

  async *sendMessage(
    messages: AIMessage[],
    context: AIContext,
    apiKey: string,
    model?: string,
    options?: SendMessageOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const systemPrompt = buildSystemPrompt(context, options?.enableTools && !options?.isToolResultContinuation, options?.isPersonalScope);
    const modelToUse = model || DEFAULT_MODELS.gemini;

    // Convert messages to Gemini format (handles function calls and responses)
    const geminiMessages = convertMessagesToGemini(messages);

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
      ...geminiMessages,
    ];

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: 16384,
      },
    };

    // Log for debugging
    console.log('[Gemini] Model:', modelToUse);
    console.log('[Gemini] Contents count:', contents.length);

    // Add tools if enabled - allow chained tool calls for multi-step operations
    if (options?.enableTools) {
      requestBody.tools = getGeminiTools(options?.isPersonalScope);
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
      const errorText = await response.text();
      console.error('[Gemini] API Error Response:', errorText);
      console.error('[Gemini] Request URL:', url.replace(apiKey, 'API_KEY_HIDDEN'));
      console.error('[Gemini] Request Body:', JSON.stringify(requestBody, null, 2));
      try {
        const error = JSON.parse(errorText);
        throw new Error(error.error?.message || `Gemini API error: ${response.status}`);
      } catch {
        throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
      }
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
      } catch {
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
              console.log('[Gemini] Part keys:', Object.keys(part));
              // thoughtSignature is a SIBLING of functionCall, not inside it
              const thoughtSig = part.thoughtSignature || part.thought_signature;
              console.log('[Gemini] Captured thoughtSignature:', thoughtSig);
              toolCalls.push({
                id: `gemini-${Date.now()}-${toolCalls.length}`,
                name: part.functionCall.name,
                arguments: part.functionCall.args || {},
                // Gemini 3: Capture thoughtSignature for function response
                thoughtSignature: thoughtSig,
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

function buildSystemPrompt(context: AIContext, enableTools?: boolean, isPersonalScope?: boolean): string {
  // Personal scope has different system prompt
  if (isPersonalScope) {
    return buildPersonalSystemPrompt(context, enableTools);
  }

  let prompt = `あなたはタスク管理アプリ「TaskFlow」のサポートAIアシスタントです。
`;

  // Put tool instructions FIRST if enabled
  if (enableTools) {
    prompt += `
## 最重要ルール - ツールの使用

あなたには複数のツールが提供されています。**ユーザーに何かを聞き返す前に、必ずツールを使って情報を取得してください。**

### 絶対禁止事項
- 「リストIDを教えてください」と聞く → 代わりに get_lists を呼ぶ
- 「どのタスクですか？」と聞く → 代わりに get_tasks を呼ぶ
- 「メンバーIDが必要です」と言う → 代わりに get_members を呼ぶ

### 操作の手順
1. 「〜リストにタスク追加して」と言われたら:
   - まず get_lists を呼んでリストIDを取得
   - 取得したIDで create_task を呼ぶ

2. 「〜さんに担当を設定して」と言われたら:
   - まず get_members を呼んでメンバーIDを取得
   - 取得したIDで assign_task を呼ぶ

### ツール一覧
- get_lists: リスト一覧を取得（order=0が一番左）
- get_members: メンバー一覧を取得
- get_labels: ラベル一覧を取得
- get_tasks: タスク一覧を取得
- get_project_summary: プロジェクト概要を取得
- create_task: タスクを作成
- update_task: タスクを更新
- delete_task: タスクを削除
- complete_task: タスクを完了
- move_task: タスクを移動
- assign_task: 担当者を設定

`;
  }

  // Get today's date in JST
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];

  prompt += `
## 現在のコンテキスト

### 日付情報
- 今日の日付: ${todayISO}
- 「今日から」「本日から」と言われた場合は ${todayISO} を開始日として使用してください

### ユーザー情報
- 名前: ${context.user.displayName}

### プロジェクト情報
- プロジェクト名: ${context.project?.name || 'なし'}
- 説明: ${context.project?.description || 'なし'}
- リスト: ${context.project?.lists.map((l) => `${l.name}(${l.taskCount}件)`).join(', ') || 'なし'}
- メンバー: ${context.project?.members.map((m) => m.displayName).join(', ') || 'なし'}
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

  return prompt;
}

/**
 * Build system prompt for personal (cross-project) scope
 */
function getTimePeriodLabel(hour: number): string {
  if (hour >= 5 && hour <= 11) return '朝';
  if (hour >= 12 && hour <= 16) return '午後';
  if (hour >= 17 && hour <= 23) return '夕方';
  return '深夜';
}

function getTimePeriodInstructions(hour: number): string {
  if (hour >= 5 && hour <= 11) {
    return `- 元気で前向きな挨拶をしてください
- タスクの整理と優先順位付けを積極的に提案してください
- 期限切れや本日期限のタスクがあれば注意喚起してください
- 「今日も一緒に頑張りましょう！」のような前向きな締めくくりを`;
  }
  if (hour >= 12 && hour <= 16) {
    return `- 午後の進捗を気遣ってください
- 負荷が高そうなら休憩や優先順位の見直しを提案してください
- 残りの時間で取り組むべきタスクを整理してください`;
  }
  if (hour >= 17 && hour <= 23) {
    return `- 「お疲れ様です」とねぎらいの言葉から始めてください
- 日報作成を積極的にサポートしてください
- 今日の成果を振り返り、達成を認めてください
- 明日への引き継ぎ事項があれば整理してください`;
  }
  return `- 遅い時間の作業をねぎらってください
- 簡潔にサポートしてください
- 体調を気遣い、無理しないよう声をかけてください`;
}

function buildPersonalSystemPrompt(context: AIContext, enableTools?: boolean): string {
  const currentHour = context.currentHour ?? new Date().getHours();
  const timePeriodLabel = getTimePeriodLabel(currentHour);
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];

  let prompt = `あなたは「相棒」— ${context.user.displayName}さんの個人タスク管理パートナーです。

## あなたの性格
- 親しみやすく温かい口調（丁寧なカジュアル体）
- パートナーとして一緒に仕事を進める姿勢
- 努力を認め、適度に励ます
- 問題は一緒に考える

## 現在の時間帯: ${timePeriodLabel}
${getTimePeriodInstructions(currentHour)}

## 役割
1. **朝の計画**: タスク整理、優先順位付け、一日の目標設定
2. **日中のサポート**: 進捗確認、優先順位調整、困りごとの相談
3. **夕方の振り返り**: 日報生成、成果の振り返り、明日の準備
`;

  if (enableTools) {
    prompt += `
## ツールの使用

積極的にツールを使って情報を取得し、ユーザーに分かりやすく提示してください。

### ツール一覧
- get_my_tasks_across_projects: 全プロジェクトの自分のタスクを取得
- get_workload_summary: ワークロードサマリーを取得
- suggest_work_priority: 作業優先順位を提案
- generate_daily_report: 日報を生成
`;
  }

  prompt += `
## 現在のコンテキスト

### 日付情報
- 今日の日付: ${todayISO}

### ユーザー情報
- 名前: ${context.user.displayName}
`;

  if (context.projects && context.projects.length > 0) {
    prompt += `
### 参加プロジェクト（${context.projects.length}件）
`;
    for (const project of context.projects) {
      prompt += `- ${project.name}`;
      if (project.description) {
        prompt += `: ${project.description}`;
      }
      prompt += '\n';
    }
  }

  prompt += `
## 回答のガイドライン
- 日本語で回答してください
- 簡潔で分かりやすい回答を心がけてください
- プロジェクト横断で優先順位や作業負荷を分析してください
- 日報やサマリーを出力する際は、マークダウン形式で見やすく整形してください
`;

  return prompt;
}
