# Contributing

## Ground Rules

1. `main` is the source of truth for source code.
2. Do not push directly to `main`.
3. All changes go through a pull request.
4. Every pull request should reference a GitHub Issue.
5. Keep changes small enough to review in one pass.

## Repository Structure

- Application code is under `src/`
- Product and engineering docs are under `docs/`
- End-to-end tests are under `e2e/`
- Supporting scripts are under `scripts/`

Run project commands from the repository root.

## Branching

- Create feature branches from `main`
- Use short names that reflect the change
- Prefer one branch per Issue

Examples:

- `feature/pat-auth`
- `fix/task-update-validation`
- `chore/github-templates`

## Pull Requests

Every pull request should include:

- linked Issue
- problem statement
- change summary
- verification steps
- rollout or follow-up notes if needed

Keep unrelated refactors out of the same pull request.

If a GitHub Issue originated from a TaskFlow board task:

- inspect the current implementation first
- do not mirror the wording blindly
- leave an `AI triage` comment before implementation
- close it immediately if it is already implemented on current `main`

Current single-operator rule:

- PRs are still required before merge
- CI is the main gate
- approval is not required unless the repository moves back to multi-maintainer review

## Checks

Current CI runs audit, lint, tests, build, and Playwright auth smoke.

Before opening a PR, run:

```bash
npm run audit
npm run deps:report
npm run lint
npm run test:run
npm run build
npm run test:e2e:smoke
```

Merge policy on GitHub:

- use squash merge
- let GitHub delete the branch on merge

## Configuration

- Do not commit real `.env` files
- Keep examples in `.env.local.example`
- Document new environment variables in the same PR that introduces them

## API and Schema Changes

When changing APIs or Firebase data shapes:

- update the implementation
- update docs or usage examples
- call out compatibility concerns in the PR

See [`docs/TASKFLOW_GITHUB_TRIAGE.md`](./docs/TASKFLOW_GITHUB_TRIAGE.md) for the TaskFlow-to-GitHub backlog handoff rules.
See [`docs/AI_DELIVERY_WORKFLOW.md`](./docs/AI_DELIVERY_WORKFLOW.md) for the full TaskFlow-to-GitHub delivery loop and sync-back expectations.
