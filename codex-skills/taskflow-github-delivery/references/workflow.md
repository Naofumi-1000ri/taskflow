# TaskFlow-GitHub Delivery Checklist

## Inputs To Capture

- TaskFlow `projectId`
- TaskFlow `taskId`
- source board URL
- GitHub repository: `Naofumi-1000ri/taskflow`
- PAT with the minimum required TaskFlow scope for the target project

## Triage States

Use exactly one of these classifications before implementation:

- `already implemented`
- `partially implemented`
- `reproducible gap`
- `needs clarification`

The GitHub Issue comment should state:

1. the classification
2. the current implementation that already exists
3. the remaining gap
4. the clarification needed, if any

## GitHub Issue Expectations

- keep the source TaskFlow task ID in the body
- keep the source board URL in the body when available
- add an `AI triage:` comment before coding starts
- close the Issue immediately if current `main` already satisfies it

## TaskFlow Sync-Back Messages

Use this structure for comment content:

```text
[AIからのメッセージ]
GitHub Issue: #123
GitHub PR: #456
状態: merged
詳細: APIキーに表示名とアイコンを追加し、PAT経由コメントで `user via actor` を表示するようにしました。
```

If there is no PR yet, send `GitHub PR: なし`.
If there is no code change, keep the final line explicit, for example:

```text
詳細: 現行実装で要件を満たしていることを確認したため、Issue を close しました。PR はありません。
```

## Required Verification

Run from `/Users/hgs/devel/project_manager/taskflow`:

```bash
npm run audit
npm run lint
npm run test:run
npm run build
npm run test:e2e:smoke
```

## Repository Docs To Keep In Sync

- `/Users/hgs/devel/project_manager/taskflow/docs/TASKFLOW_GITHUB_TRIAGE.md`
- `/Users/hgs/devel/project_manager/taskflow/docs/GITHUB_WORKFLOW.md`
- `/Users/hgs/devel/project_manager/taskflow/docs/API_INTEGRATION.md`
- `/Users/hgs/devel/project_manager/taskflow/docs/AI_DELIVERY_WORKFLOW.md`
