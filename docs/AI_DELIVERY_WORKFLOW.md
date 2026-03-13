# AI Delivery Workflow

This repository blends project management and implementation work.
TaskFlow holds the runtime backlog. GitHub holds the source of truth for issues, code review,
merge history, and delivery state.

## Delivery Loop

1. Start from a TaskFlow task or a GitHub Issue.
2. If the source is TaskFlow, inspect the current implementation before creating or updating a GitHub Issue.
3. Classify the request as `already implemented`, `partially implemented`, `reproducible gap`, or `needs clarification`.
4. Leave an `AI triage:` comment in the GitHub Issue.
5. Implement only after the task is explicit enough.
6. Open a PR, run the required checks, and merge through the normal GitHub workflow.
7. Write an `[AIからのメッセージ]` comment back to the originating TaskFlow task with the GitHub Issue number, PR number, and delivery summary.

## Required Sync-Back Points

Leave a TaskFlow AI comment at these milestones:

- triage completed
- meaningful scope change during implementation
- PR opened
- merged
- closed without code

The message should include:

- GitHub Issue number
- GitHub PR number or `なし`
- a short status line
- a short Japanese summary of what changed or why the Issue closed

## Source Of Truth Rule

If the local Codex skill and this repository document ever diverge, this repository wins.
Update docs in the same PR when the workflow changes.

## Codex Skill

The local skill name is `taskflow-github-delivery`.

Versioned skill source lives in:

- `/Users/hgs/devel/project_manager/taskflow/codex-skills/taskflow-github-delivery`

The installed local copy lives in:

- `$CODEX_HOME/skills/taskflow-github-delivery`

The helper script for posting AI sync-back comments is:

- `/Users/hgs/devel/project_manager/taskflow/codex-skills/taskflow-github-delivery/scripts/post_taskflow_ai_message.py`

## Related Docs

- [`TASKFLOW_GITHUB_TRIAGE.md`](./TASKFLOW_GITHUB_TRIAGE.md)
- [`GITHUB_WORKFLOW.md`](./GITHUB_WORKFLOW.md)
- [`API_INTEGRATION.md`](./API_INTEGRATION.md)
