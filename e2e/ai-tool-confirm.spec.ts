import { test, expect, Page } from '@playwright/test';

/**
 * 相棒AIのツール実行確認ダイアログのE2Eテスト
 *
 * 回帰テスト: ツール連鎖の途中でAIが2回目の確認を要求したとき、
 * 1回目の確認処理の後始末（setPendingTools(null)）が新しい確認内容を
 * 上書きしてしまい、ダイアログが空表示になり「実行する」が無反応になるバグ。
 */

// SSE レスポンスを組み立てる
function sse(events: Array<Record<string, unknown>>): string {
  return (
    events.map((e) => `data: ${JSON.stringify(e)}`).join('\n\n') +
    '\n\ndata: [DONE]\n\n'
  );
}

// AIチャットAPIをモック:
// マーカーを含むユーザー発話に対し、確認必須ツール(delete_task)を2ラウンド連続で返す
async function mockAIChat(page: Page, marker: string) {
  await page.route('**/api/ai/chat', async (route) => {
    const body = route.request().postDataJSON() as {
      messages?: Array<{ role: string; content: string }>;
    };
    const messages = body?.messages ?? [];
    const toolRounds = messages.filter((m) => m.role === 'tool').length;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');

    let payload: string;
    if (!lastUser?.content?.includes(marker)) {
      // 自動挨拶などテスト対象外の呼び出しはテキストのみ返す
      payload = sse([{ type: 'text', content: 'こんにちは！' }]);
    } else if (toolRounds === 0) {
      payload = sse([
        { type: 'text', content: '1件目のタスクを削除します。' },
        {
          type: 'tool_calls',
          toolCalls: [
            { id: 'call-1', name: 'delete_task', arguments: { taskId: 'e2e-task-1' } },
          ],
        },
      ]);
    } else if (toolRounds === 1) {
      // ツール連鎖の途中で再度確認が必要な操作を要求（バグの再現条件）
      payload = sse([
        { type: 'text', content: '続けて2件目のタスクを削除します。' },
        {
          type: 'tool_calls',
          toolCalls: [
            { id: 'call-2', name: 'delete_task', arguments: { taskId: 'e2e-task-2' } },
          ],
        },
      ]);
    } else {
      payload = sse([{ type: 'text', content: 'すべての操作が完了しました。' }]);
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: payload,
    });
  });
}

test.describe('相棒AI ツール実行確認ダイアログ', () => {
  test('連続する確認ダイアログで2回目も内容が表示され実行できる', async ({ page }) => {
    const marker = 'E2E確認テスト';

    // テストユーザーはFirestore権限がないため、シード済みプロジェクトを持つ
    // デモユーザーでログインする（AIパネルはプロジェクトが1つ以上ないと無効）
    await page.goto('/login');
    await page.getByTestId('demo-login').click();
    await page.waitForURL('/', { timeout: 60000 });

    // AIプロバイダ設定済みの状態を再現（キー自体はモックするので不要）
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'ai-settings-storage',
        JSON.stringify({
          state: { provider: 'openai', openaiKeyConfigured: true },
          version: 0,
        })
      );
    });

    // AI関連APIをモック
    await page.route('**/api/ai/settings', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ allowedProjectIds: null }),
      })
    );
    await mockAIChat(page, marker);

    await page.goto('/');

    // 開発ビルドの React Query Devtools ボタンが右下のAIトグルに重なるため非表示にする
    await page.addStyleTag({
      content: '.tsqd-parent-container { display: none !important; }',
    });

    // AIパネルを開いてメッセージ送信
    await page.click('[data-testid="companion-ai-toggle"]');
    const input = page.locator('textarea[placeholder*="何でも聞いてください"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await expect(input).toBeEnabled({ timeout: 15000 });
    await input.fill(`${marker}: 完了済みタスクを2件削除して`);
    await input.press('Enter');

    // --- 1回目の確認ダイアログ ---
    const executeButton = page.locator('[data-testid="tool-confirm-execute"]');
    await expect(executeButton).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="tool-confirm-item"]').first()
    ).toBeVisible();
    await executeButton.click();

    // --- 2回目の確認ダイアログ（回帰の本丸） ---
    // 旧コードでは pendingTools が null に上書きされ、
    // 内容が空になり「実行する」を押しても何も起きなかった
    await expect(executeButton).toBeVisible({ timeout: 15000 });
    await expect(
      page.locator('[data-testid="tool-confirm-item"]').first()
    ).toBeVisible({ timeout: 5000 });
    await expect(executeButton).toBeEnabled();
    await executeButton.click();

    // 実行ボタンのクリックが機能し、ダイアログが閉じて完了メッセージが表示される
    await expect(executeButton).not.toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=すべての操作が完了しました。')).toBeVisible({
      timeout: 15000,
    });
  });
});
