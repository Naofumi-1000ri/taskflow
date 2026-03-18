---
name: taskflow-github-delivery
description: Triage TaskFlow board tasks, mirror them into GitHub issues only after classification, implement changes in the TaskFlow repository, open and merge pull requests, and sync `[AIからのメッセージ]` progress back to the originating TaskFlow task. Use when working in `/Users/hgs/devel/project_manager/taskflow` on requests that begin from a TaskFlow task or need GitHub Issue and PR coordination with TaskFlow status feedback.
---

# TaskFlow GitHub Delivery

## Overview

Use this skill to run the delivery loop between TaskFlow and GitHub for this repository.
Treat TaskFlow as the runtime backlog and GitHub as the source of truth for code review,
merge history, and release state.

## Agent Folders

Single-function agent folders live under
`/Users/hgs/devel/project_manager/taskflow/codex-skills/taskflow-github-delivery/agents/`.

- `issue-to-code`: triage a scoped Issue, implement the change, verify it, and open the PR
- `pr-review`: review the PR for bugs, regressions, and missing verification before merge
- `merge-deploy`: merge an accepted PR and confirm the resulting `main` and deploy state

Use `agents/pipeline.yaml` as the handoff contract between those folders.
Keep each folder single-purpose; do not fold review or merge responsibilities back into
`issue-to-code`.

## Workflow

1. Build context first.
   - Capture the TaskFlow `projectId`, `taskId`, and board URL when the request starts from a TaskFlow task.
   - Read `/Users/hgs/devel/project_manager/taskflow/docs/TASKFLOW_GITHUB_TRIAGE.md` before creating or updating a GitHub Issue.
   - Read `/Users/hgs/devel/project_manager/taskflow/docs/API_INTEGRATION.md` when you need API examples or token scope details.
2. Triage before mirroring.
   - Inspect the current UI, API, or code path before treating the task as new work.
   - Classify the request as `already implemented`, `partially implemented`, `reproducible gap`, or `needs clarification`.
   - Leave an `AI triage:` comment in the GitHub Issue and close it immediately if current `main` already satisfies the request.
3. Create GitHub artifacts deliberately.
   - Preserve the source TaskFlow task ID and board URL in the GitHub Issue body.
   - Use `codex/<short-name>` for Codex-created working branches.
   - Open a PR that links the Issue and keeps scope narrow.
4. Implement and verify.
   - Update docs in the same change when API shape, workflow, or operator expectations change.
   - Run `npm run audit`, `npm run lint`, `npm run test:run`, `npm run build`, and `npm run test:e2e:smoke` from `/Users/hgs/devel/project_manager/taskflow`.
5. Sync progress back to TaskFlow.
   - Leave an `[AIからのメッセージ]` comment on the originating TaskFlow task when triage completes, when a PR opens, and when work merges or closes without code.
   - Use `scripts/post_taskflow_ai_message.py` to post deterministic sync-back comments instead of retyping curl payloads each time.
6. Close the loop.
   - After merge, sync the final GitHub Issue number, PR number, and implementation summary back to TaskFlow.
   - Keep the GitHub Project item state aligned when the repository workflow requires it.

## Guardrails

- Do not mirror vague human wording into GitHub without interpretation.
- Prefer `already implemented` or `partially implemented` when they match reality.
- Do not claim the loop is closed until the originating TaskFlow task has an AI message with the final GitHub status.
- If the workflow changes, update the repository docs because GitHub is the source of truth for the process.

## Resources

- Read `references/workflow.md` for the exact checklist and sync-back expectations.
- Run `scripts/post_taskflow_ai_message.py --help` to post `[AIからのメッセージ]` comments back to TaskFlow.
