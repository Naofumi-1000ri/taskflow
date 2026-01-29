import { AIContext, AIMessage, DEFAULT_MODELS } from '@/types/ai';
import { AIProvider, StreamChunk, SendMessageOptions } from './types';
import { getOpenAITools } from '../tools';
import { ToolCall } from '../tools/types';

/**
 * Convert AIMessage array to OpenAI message format
 * Handles tool_calls (assistant) and tool result messages
 */
function convertMessagesToOpenAI(messages: AIMessage[]): Array<Record<string, unknown>> {
  const result: Array<Record<string, unknown>> = [];

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      // Check if this is an assistant message with tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        result.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            },
          })),
        });
      } else {
        // Regular text-only assistant message
        result.push({
          role: 'assistant',
          content: msg.content,
        });
      }
    } else if (msg.role === 'tool') {
      // Tool result message
      result.push({
        role: 'tool',
        tool_call_id: msg.toolCallId,
        content: msg.content,
      });
    } else {
      // User or system message
      result.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return result;
}

export class OpenAIProvider implements AIProvider {
  name = 'openai' as const;

  async *sendMessage(
    messages: AIMessage[],
    context: AIContext,
    apiKey: string,
    model?: string,
    options?: SendMessageOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Resolve projectId: explicit null = personal scope, undefined = use context
    const resolvedProjectId = options?.projectId !== undefined
      ? options.projectId
      : (context.project?.id || null);
    const systemPrompt = buildCompanionSystemPrompt(context, options?.enableTools && !options?.isToolResultContinuation, resolvedProjectId);
    const modelToUse = model || DEFAULT_MODELS.openai;

    // Convert messages to OpenAI format (handles tool_calls and tool results)
    const openAIMessages = convertMessagesToOpenAI(messages);

    const requestBody: Record<string, unknown> = {
      model: modelToUse,
      messages: [
        { role: 'system', content: systemPrompt },
        ...openAIMessages,
      ],
      stream: true,
    };

    // Add tools if enabled - allow chained tool calls for multi-step operations
    if (options?.enableTools) {
      requestBody.tools = getOpenAITools({ projectId: resolvedProjectId });
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

/**
 * Unified companion system prompt builder.
 * Always uses "相棒" personality. Adds project context when projectId is present.
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

function buildCompanionSystemPrompt(context: AIContext, enableTools?: boolean, projectId?: string | null): string {
  const currentHour = context.currentHour ?? new Date().getHours();
  const timePeriodLabel = getTimePeriodLabel(currentHour);
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];
  const hasProject = !!projectId;

  let prompt = `あなたは「相棒」— ${context.user.displayName}さんのタスク管理パートナーです。

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

## 現在のコンテキスト

### 日付情報
- 今日の日付: ${todayISO}
- 「今日から」「本日から」と言われた場合は ${todayISO} を開始日として使用してください

### ユーザー情報
- 名前: ${context.user.displayName}
`;

  // Project context (when on a project page)
  if (hasProject && context.project) {
    prompt += `
### プロジェクト情報（現在のプロジェクト）
- プロジェクト名: ${context.project.name}
- 説明: ${context.project.description || 'なし'}
- リスト: ${context.project.lists.map((l) => `${l.name}(${l.taskCount}件)`).join(', ') || 'なし'}
- メンバー: ${context.project.members.map((m) => m.displayName).join(', ') || 'なし'}
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
  }

  // Cross-project overview (dashboard)
  if (!hasProject && context.projects && context.projects.length > 0) {
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

  // Tool instructions
  if (enableTools) {
    if (hasProject) {
      prompt += `
## ツールの使用（非常に重要）

### 最重要ルール
**質問には情報取得ツール（get_*）を使い、依頼にはタスク操作ツールを使ってください。**

⚠️ **絶対にやってはいけないこと**：
- 「タスクはいくつある？」という質問に対して「タスク数を調べる」というタスクを作成する
- 「完了したタスクは？」という質問に対して「完了タスクを確認する」というタスクを作成する
- 質問への回答としてcreate_taskを使う

### 質問への対応（情報取得ツールを使う）
以下のような**質問**には、必ず**get_*ツール**で情報を取得してください：

| ユーザーの発言パターン | 使うべきツール |
|----------------------|--------------|
| 「〜はいくつ？」「〜の数は？」「何件ある？」 | get_project_summary または get_tasks |
| 「完了したタスクは？」「タスクの状況は？」 | get_project_summary |
| 「期限切れのタスクはある？」「遅れているタスクは？」 | get_overdue_tasks |
| 「私のタスクは？」「自分の担当は？」 | get_my_tasks |
| 「〜の詳細を教えて」「〜について教えて」 | get_task_details |
| 「タスク一覧を見せて」「何がある？」 | get_tasks |
| 「リスト一覧」「一番左のリスト」「どんなリストがある？」 | get_lists |
| 「メンバー一覧」「誰がいる？」「担当者は誰？」 | get_members |
| 「ラベル一覧」「どんなラベルがある？」 | get_labels |

### 依頼への対応（タスク操作ツールを使う）
以下のような**依頼・命令**には、タスク操作ツールを使ってください：

| ユーザーの発言パターン | 使うべきツール |
|----------------------|--------------|
| 「〜を作成して」「〜を追加して」「〜というタスクを作って」 | create_task / create_tasks |
| 「〜を変更して」「期限を〜に」「優先度を〜に」 | update_task |
| 「〜を完了にして」「〜を終わらせて」 | complete_task |
| 「〜を削除して」 | delete_task |
| 「〜を別のリストに移動して」 | move_task |
| 「〜を担当に設定して」 | assign_task |

### クロスプロジェクトツール
- get_my_tasks_across_projects: 全プロジェクトの自分のタスクを取得
- get_workload_summary: ワークロードサマリーを取得
- suggest_work_priority: 作業優先順位を提案
- generate_daily_report: 日報を生成

### 具体例
✅ 正しい：「完了したタスクは何件？」→ get_project_summary を呼び出し → 結果を回答
❌ 間違い：「完了したタスクは何件？」→ create_task({title: "完了タスクを数える"})

✅ 正しい：「買い物リストを作成して」→ create_task({title: "買い物リスト"})
❌ 間違い：「タスクの状況は？」→ create_task({title: "タスク状況を確認"})
`;
    } else {
      prompt += `
## ツールの使用

積極的にツールを使って情報を取得し、ユーザーに分かりやすく提示してください。

### ツール一覧
- get_my_tasks_across_projects: 全プロジェクトの自分のタスクを取得
- get_workload_summary: ワークロードサマリーを取得
- suggest_work_priority: 作業優先順位を提案
- generate_daily_report: 日報を生成
- update_task: タスクを更新（projectIdパラメータ必須）
- complete_task: タスクを完了/未完了にする（projectIdパラメータ必須）

### タスク修正の手順（ダッシュボードから）
1. まず get_my_tasks_across_projects でタスク一覧を取得（各タスクにprojectIdが含まれる）
2. 取得した projectId と taskId を使って update_task や complete_task を呼ぶ

例：「このタスクを完了にして」→ get_my_tasks_across_projects → complete_task({ projectId: "...", taskId: "...", isCompleted: true })
`;
    }
  }

  prompt += `
## 回答のガイドライン
- 日本語で回答してください
- 簡潔で分かりやすい回答を心がけてください
- タスク管理に関するアドバイスを提供してください
- 必要に応じてタスクの分解や優先順位付けの提案をしてください
${!hasProject ? '- プロジェクト横断で優先順位や作業負荷を分析してください\n- 日報やサマリーを出力する際は、マークダウン形式で見やすく整形してください' : ''}
`;

  return prompt;
}
