# TaskFlow 開発ログ

## プロジェクト概要

**TaskFlow** は Jooto クローンのプロジェクト管理アプリケーションです。

- **開発期間**: 2025年12月18日
- **技術スタック**: Next.js 16, TypeScript, Tailwind CSS v4, Firebase, dnd-kit

---

## ユーザー指示と実装内容

### 1. 初期セットアップ

**指示**: Jootoクローンのプロジェクト管理アプリを作成

**実装内容**:
- Next.js 16 プロジェクトの作成
- TypeScript + Tailwind CSS v4 の設定
- Firebase (Authentication, Firestore, Storage) の統合
- shadcn/ui コンポーネントライブラリの導入

### 2. 認証機能

**指示**: ログイン機能の実装

**実装内容**:
- `/src/lib/firebase/auth.ts` - Firebase Authentication 連携
- `/src/lib/firebase/config.ts` - Firebase 初期化設定
- `/src/components/providers/AuthProvider.tsx` - 認証状態管理
- `/src/app/(auth)/login/page.tsx` - ログインページ
- Google OAuth 認証
- E2Eテスト用テストユーザー認証

### 3. プロジェクト管理

**指示**: プロジェクトの作成・管理機能

**実装内容**:
- `/src/hooks/useProjects.ts` - プロジェクトデータ取得・操作フック
- `/src/lib/firebase/firestore.ts` - Firestore CRUD操作
- `/src/components/project/ProjectFormModal.tsx` - プロジェクト作成/編集モーダル
- `/src/components/project/ProjectCard.tsx` - プロジェクトカード表示
- `/src/app/(dashboard)/projects/page.tsx` - プロジェクト一覧ページ

### 4. カンバンボード

**指示**: 看板の移動機能（ドラッグ&ドロップ）

**実装内容**:
- `/src/components/board/BoardView.tsx` - カンバンボードメインコンポーネント
- `/src/components/board/BoardList.tsx` - リスト（カラム）コンポーネント
- `/src/components/board/TaskCard.tsx` - タスクカードコンポーネント
- `/src/hooks/useBoard.ts` - ボードデータ管理フック
- dnd-kit によるドラッグ&ドロップ実装
- リスト間・リスト内でのタスク移動

### 5. ガントチャート

**指示**: ガントチャート表示機能

**実装内容**:
- `/src/components/gantt/GanttChart.tsx` - ガントチャートコンポーネント
- `/src/lib/utils/gantt.ts` - ガントチャート用ユーティリティ関数
- 日/週/月表示切り替え
- 今日へスクロール機能
- タスクバーのクリックで詳細表示

### 6. タスク詳細モーダル（Jooto風レイアウト）

**指示**:
- コメント欄を追加
- チェックリストをタブではなく詳細に入れる
- タブの廃止、情報が見えなくなる縦長を採用
- Jootoの画面を参考

**実装内容**:
- `/src/components/task/TaskDetailModal.tsx` - タスク詳細モーダル（全面改修）
  - タブUIを廃止
  - 縦長スクロールレイアウトに変更
  - メタデータ行（期間、担当者、ラベル、優先度）
  - チェックリストを詳細内に直接表示（進捗バー付き）
  - コメント入力欄を下部に配置
- `/src/components/task/ChecklistSection.tsx` - チェックリストコンポーネント
- `/src/components/task/CommentSection.tsx` - コメントコンポーネント
- `/src/components/task/AttachmentSection.tsx` - 添付ファイルコンポーネント

### 7. ダッシュボード

**指示**: ダッシュボードのモックデータを実データに変更

**実装内容**:
- `/src/app/(dashboard)/page.tsx` - ダッシュボードページ
  - モックデータを削除
  - `useProjects` フックで実際のFirestoreデータを取得
  - ローディング状態（Skeleton）表示
  - エラー状態（オフライン）表示
  - 空状態の表示

### 8. サイドバー

**指示**: サイドバーのモックデータを修正（「プロジェクトがみつかりません」エラーの修正）

**実装内容**:
- `/src/components/common/Sidebar.tsx` - サイドバーコンポーネント
  - ハードコードされたモックプロジェクトを削除
  - `useProjects` フックで実際のプロジェクトを取得

### 9. Firebase設定

**指示**: Firestore接続エラーの解決

**実装内容**:
- `/src/lib/firebase/config.ts` - Firestoreオフライン永続化の追加
- `/src/lib/firebase/firestore.ts` - `onSnapshot` エラーハンドリング追加
- `/src/hooks/useProjects.ts` - エラー状態の管理追加
- Firestoreセキュリティルールの設定ガイド
- 複合インデックス作成の案内

### 10. テスト

**実装内容**:
- `/e2e/auth.spec.ts` - 認証E2Eテスト
- `/e2e/board.spec.ts` - カンバンボードE2Eテスト
- `/e2e/gantt.spec.ts` - ガントチャートE2Eテスト
- `/e2e/project.spec.ts` - プロジェクト管理E2Eテスト
- `/src/lib/utils/gantt.test.ts` - ガントチャートユニットテスト
- `/src/lib/utils/task.test.ts` - タスクユーティリティユニットテスト
- Playwright + Vitest 設定

---

## ファイル構成

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # ダッシュボード
│   │   └── projects/
│   │       ├── page.tsx                # プロジェクト一覧
│   │       └── [projectId]/
│   │           ├── layout.tsx
│   │           ├── board/page.tsx      # カンバンボード
│   │           ├── gantt/page.tsx      # ガントチャート
│   │           └── settings/page.tsx   # プロジェクト設定
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── board/
│   │   ├── BoardView.tsx
│   │   ├── BoardList.tsx
│   │   └── TaskCard.tsx
│   ├── common/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── gantt/
│   │   └── GanttChart.tsx
│   ├── project/
│   │   ├── ProjectCard.tsx
│   │   └── ProjectFormModal.tsx
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   └── index.tsx
│   ├── task/
│   │   ├── TaskDetailModal.tsx
│   │   ├── ChecklistSection.tsx
│   │   ├── CommentSection.tsx
│   │   └── AttachmentSection.tsx
│   └── ui/                             # shadcn/ui コンポーネント
├── hooks/
│   ├── useAuth.ts
│   ├── useBoard.ts
│   ├── useProjects.ts
│   └── useTaskDetails.ts
├── lib/
│   ├── firebase/
│   │   ├── auth.ts
│   │   ├── config.ts
│   │   ├── firestore.ts
│   │   └── storage.ts
│   ├── utils.ts
│   └── utils/
│       ├── gantt.ts
│       └── task.ts
├── stores/
│   ├── authStore.ts
│   └── uiStore.ts
└── types/
    └── index.ts
```

---

## 必要なFirebase設定

### Firestoreセキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 必要なFirestoreインデックス

- `projects` コレクション:
  - `memberIds` (Arrays) + `isArchived` (Ascending) + `updatedAt` (Descending)

---

## コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e
```

---

## 解決した問題

1. **「プロジェクトがみつかりません」エラー**
   - 原因: サイドバーのハードコードされたモックデータ
   - 解決: `useProjects` フックで実際のFirestoreデータを取得

2. **「client is offline」エラー**
   - 原因: Firestoreデータベース未作成、インデックス未作成
   - 解決: Firestoreデータベース作成、複合インデックス作成、オフライン永続化の有効化

3. **タスク詳細のUI改善**
   - 要望: Jooto風の縦長レイアウト、タブ廃止
   - 解決: タブを削除し、チェックリストとコメントを詳細内に直接表示

### 11. AIアシスタント機能

**指示**: プロジェクト内AIアシスタント機能の実装

**実装内容**:
- `/src/lib/ai/tools/` - AI Function Calling用ツール
  - `createTask.ts` - タスク作成ツール
  - `updateTask.ts` - タスク更新ツール
  - `deleteTask.ts` - タスク削除ツール
  - `taskTools.ts` - タスク操作（完了、移動、担当者設定）
  - `queryTasks.ts` - タスク取得ツール（一覧、詳細、マイタスク、期限切れ）
  - `projectQueries.ts` - プロジェクト情報取得ツール（リスト、メンバー、ラベル）
  - `scheduleAnalysis.ts` - スケジュール分析ツール
  - `planGeneration.ts` - タスク計画生成ツール
  - `qualityAssistance.ts` - 品質改善提案ツール
- `/src/lib/ai/providers/` - AIプロバイダー連携
  - `anthropic.ts` - Anthropic Claude API
  - `openai.ts` - OpenAI GPT API
  - `gemini.ts` - Google Gemini API
- `/src/components/ai/SupportAIPanel.tsx` - AIパネルコンポーネント
- `/src/hooks/useConversation.ts` - 会話管理フック
- `/src/stores/aiSettingsStore.ts` - AI設定ストア
- マルチプロバイダー対応（OpenAI, Anthropic, Gemini）
- Function Callingによるタスク操作
- 会話履歴の永続化（Firestore）
- ストリーミングレスポンス

### 12. パーソナルAIアシスタント

**指示**: ダッシュボードレベルで動作する個人AIアシスタントを追加。参加している全プロジェクトを横断して、作業優先順位の相談や日報生成ができる。

**実装内容**:

#### 個人AI用ツール（4種類）
- `/src/lib/ai/tools/personalTools.ts`
  - `get_my_tasks_across_projects` - 全プロジェクトを横断して自分のタスクを取得
  - `get_workload_summary` - ワークロード分析（期限切れ、今日/今週期限、プロジェクト別負荷）
  - `suggest_work_priority` - 作業優先順位の提案（期限、優先度、依存関係、ブロック状態を考慮）
  - `generate_daily_report` - 日報生成（完了/進行中/ブロック中タスク、マークダウン形式出力）

#### 型定義の拡張
- `/src/lib/ai/tools/types.ts`
  - `AIScope` 型追加 (`'project' | 'personal'`)
  - `ToolExecutionContext` に `scope`, `projectIds` を追加
- `/src/types/ai.ts`
  - `AIScope` 型追加
  - `AIConversation` に `scope` フィールド追加
  - `AIContext` に `projects` 配列追加（個人スコープ用）

#### 個人会話ストレージ
- `/src/lib/ai/conversationStorage.ts` - 個人会話用関数を追加
  - 保存先: `users/{userId}/personalConversations/{conversationId}`
  - `createPersonalConversation()`
  - `updatePersonalConversationTitle()`
  - `deletePersonalConversation()`
  - `getPersonalConversations()`
  - `subscribeToPersonalConversations()`
  - `addPersonalMessage()`
  - `getPersonalMessages()`
  - `subscribeToPersonalMessages()`

#### 個人AIコンポーネント
- `/src/components/ai/PersonalAIButton.tsx` - フローティングAIボタン
  - 画面右下に配置
  - クリックで展開→チャットパネル（420x600px）
  - クイックアクション: 「今日の優先順位」「日報生成」「負荷確認」
  - 会話履歴サイドバー
  - ESCまたは外クリックで閉じる
  - 展開状態をlocalStorageで記憶

#### 個人会話フック
- `/src/hooks/usePersonalConversations.ts` - 個人会話リスト管理
- `/src/hooks/usePersonalConversation.ts` - 個人会話メッセージング

#### レイアウト更新
- `/src/app/(dashboard)/layout.tsx`
  - プロジェクトページでは `SupportAIPanel` を表示
  - ダッシュボード（非プロジェクトページ）では `PersonalAIButton` を表示

#### AIプロバイダー更新
- 全プロバイダー（Anthropic, OpenAI, Gemini）を更新
  - `isPersonalScope` パラメータ対応
  - 個人スコープ用システムプロンプト追加
  - 個人ツール読み込み対応

---

## ファイル構成

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # ダッシュボード
│   │   └── projects/
│   │       ├── page.tsx                # プロジェクト一覧
│   │       └── [projectId]/
│   │           ├── layout.tsx
│   │           ├── board/page.tsx      # カンバンボード
│   │           ├── gantt/page.tsx      # ガントチャート
│   │           └── settings/page.tsx   # プロジェクト設定
│   ├── api/
│   │   └── ai/
│   │       └── chat/route.ts           # AI Chat API
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ai/
│   │   ├── SupportAIPanel.tsx          # プロジェクトAIパネル
│   │   ├── PersonalAIButton.tsx        # 個人AIフローティングボタン
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ConversationList.tsx
│   │   └── ToolConfirmDialog.tsx
│   ├── board/
│   │   ├── BoardView.tsx
│   │   ├── BoardList.tsx
│   │   └── TaskCard.tsx
│   ├── common/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── gantt/
│   │   └── GanttChart.tsx
│   ├── project/
│   │   ├── ProjectCard.tsx
│   │   └── ProjectFormModal.tsx
│   ├── providers/
│   │   ├── AuthProvider.tsx
│   │   ├── QueryProvider.tsx
│   │   └── index.tsx
│   ├── task/
│   │   ├── TaskDetailModal.tsx
│   │   ├── ChecklistSection.tsx
│   │   ├── CommentSection.tsx
│   │   └── AttachmentSection.tsx
│   └── ui/                             # shadcn/ui コンポーネント
├── hooks/
│   ├── useAuth.ts
│   ├── useBoard.ts
│   ├── useProjects.ts
│   ├── useTaskDetails.ts
│   ├── useConversation.ts              # プロジェクトAI会話
│   ├── useAIConversations.ts
│   ├── usePersonalConversation.ts      # 個人AI会話
│   └── usePersonalConversations.ts
├── lib/
│   ├── ai/
│   │   ├── conversationStorage.ts      # 会話ストレージ（プロジェクト＋個人）
│   │   ├── contextBuilder.ts
│   │   ├── toolExecutor.ts
│   │   ├── providers/
│   │   │   ├── types.ts
│   │   │   ├── index.ts
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── gemini.ts
│   │   └── tools/
│   │       ├── types.ts
│   │       ├── index.ts
│   │       ├── createTask.ts
│   │       ├── updateTask.ts
│   │       ├── deleteTask.ts
│   │       ├── taskTools.ts
│   │       ├── queryTasks.ts
│   │       ├── projectQueries.ts
│   │       ├── scheduleAnalysis.ts
│   │       ├── planGeneration.ts
│   │       ├── qualityAssistance.ts
│   │       └── personalTools.ts        # 個人AI用ツール
│   ├── firebase/
│   │   ├── auth.ts
│   │   ├── config.ts
│   │   ├── firestore.ts
│   │   └── storage.ts
│   ├── utils.ts
│   └── utils/
│       ├── gantt.ts
│       └── task.ts
├── stores/
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── aiSettingsStore.ts
└── types/
    ├── index.ts
    └── ai.ts                           # AI関連型定義
```

---

## 必要なFirebase設定

### Firestoreセキュリティルール

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 必要なFirestoreインデックス

- `projects` コレクション:
  - `memberIds` (Arrays) + `isArchived` (Ascending) + `updatedAt` (Descending)

---

## コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e
```

---

## 解決した問題

1. **「プロジェクトがみつかりません」エラー**
   - 原因: サイドバーのハードコードされたモックデータ
   - 解決: `useProjects` フックで実際のFirestoreデータを取得

2. **「client is offline」エラー**
   - 原因: Firestoreデータベース未作成、インデックス未作成
   - 解決: Firestoreデータベース作成、複合インデックス作成、オフライン永続化の有効化

3. **タスク詳細のUI改善**
   - 要望: Jooto風の縦長レイアウト、タブ廃止
   - 解決: タブを削除し、チェックリストとコメントを詳細内に直接表示

---

## 今後の拡張案

- [x] 担当者アサイン機能
- [x] AIアシスタント機能（プロジェクト単位）
- [x] パーソナルAIアシスタント（全プロジェクト横断）
- [ ] 通知機能
- [ ] ファイル添付のプレビュー
- [ ] タスクのフィルター・検索
- [ ] プロジェクトメンバー招待
- [ ] アクティビティログ
- [ ] ダークモード対応

---

*このドキュメントは Claude Code によって生成されました。*
