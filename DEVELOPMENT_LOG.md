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

---

## 今後の拡張案

- [ ] 担当者アサイン機能
- [ ] 通知機能
- [ ] ファイル添付のプレビュー
- [ ] タスクのフィルター・検索
- [ ] プロジェクトメンバー招待
- [ ] アクティビティログ
- [ ] ダークモード対応

---

*このドキュメントは Claude Code によって生成されました。*
