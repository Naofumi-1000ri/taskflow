# TaskFlow

TaskFlow is a Next.js application for project and task management with Firebase-backed real-time data and a server-side API layer for integrations.

## Stack

- Next.js 16
- React 19
- Firebase Authentication
- Firestore
- Firebase Storage
- Vitest
- Playwright

## Local Setup

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment

Required client-side Firebase values are documented in [`.env.local.example`](./.env.local.example).

Server-side API routes that use Firebase Admin require one of:

- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `GOOGLE_APPLICATION_CREDENTIALS`

## Source Of Truth

- Source code: GitHub
- Runtime application data: Firebase
- Review and delivery workflow: GitHub Issues + Pull Requests

Repository-wide contribution rules live in [`./CONTRIBUTING.md`](./CONTRIBUTING.md).

## Scripts

```bash
npm run dev
npm run audit
npm run deps:report
npm run build
npm run start
npm run test:run
npm run test:e2e
npm run test:e2e:smoke
npm run lint
```

## Checks

Current baseline:

- `npm run test:run` passes
- `npm run lint` passes
- `npm run audit` passes
- `npm run deps:report` generates a dependency health report
- `npm run build` passes
- GitHub Actions runs `taskflow-ci / audit`, `taskflow-ci / lint`, `taskflow-ci / test`, `taskflow-ci / build`, and `taskflow-ci / e2e-smoke`

Weekly maintenance automation also runs `taskflow-maintenance`, which uploads a dependency health report and updates a tracking issue when findings exist.
Known deferred update: `eslint@10.x` is intentionally held back until `eslint-config-next` becomes runtime-compatible.

The build script runs through `scripts/run-next-build.mjs`, which suppresses the known
`baseline-browser-mapping` false-positive warning while preserving the real build exit code and other output.

Lint should stay green on every PR. See [`docs/LINT_DEBT.md`](./docs/LINT_DEBT.md) for maintenance rules and allowed exceptions.

## API

Server routes live under `src/app/api`.

Current integration routes:

- `GET /api/projects`
- `GET /api/projects/[projectId]/lists`
- `GET /api/projects/[projectId]/status`
- `GET /api/projects/[projectId]/tasks`
- `POST /api/projects/[projectId]/tasks`
- `PATCH /api/projects/[projectId]/tasks/[taskId]`
- `DELETE /api/projects/[projectId]/tasks/[taskId]`
- `POST /api/projects/[projectId]/tasks/[taskId]/restore`
- `GET /api/auth/tokens`
- `POST /api/auth/tokens`
- `PATCH /api/auth/tokens/[tokenId]`
- `DELETE /api/auth/tokens/[tokenId]`

See [`docs/API.md`](./docs/API.md) for the current API surface and auth model.
See [`docs/API_INTEGRATION.md`](./docs/API_INTEGRATION.md) for curl examples and integration flow.
See [`docs/GITHUB_WORKFLOW.md`](./docs/GITHUB_WORKFLOW.md) for GitHub workflow rules.
See [`docs/LINT_DEBT.md`](./docs/LINT_DEBT.md) for current lint status and maintenance rules.
See [`docs/ESLINT10_TRACKING.md`](./docs/ESLINT10_TRACKING.md) for the deferred ESLint 10 upgrade.

## API Auth

TaskFlow supports two auth modes for server routes:

1. Firebase ID token for first-party authenticated UI requests
2. Personal access token with `tf_` prefix for external integrations

API tokens act as a user identity. Effective access is limited by:

- token permissions
- allowed project scope on the token
- project membership
- member role (`viewer`, `editor`, `admin`)

## Testing Notes

Unit and integration tests use Vitest. End-to-end coverage uses Playwright.

- `npm run test:e2e:smoke` is the CI-safe baseline. It uses dummy Firebase config and verifies the unauthenticated login flow plus protected-route redirect without external secrets.
- `npm run test:e2e:smoke` also runs a mock-authenticated settings smoke using `NEXT_PUBLIC_E2E_MOCK_AUTH=true`.
- `npm run test:e2e` remains the broader local suite and expects a real Firebase-backed local environment, including optional `NEXT_PUBLIC_ENABLE_TEST_AUTH=true` for the existing test-user flow.

See [`docs/E2E_STRATEGY.md`](./docs/E2E_STRATEGY.md) for the current test-mode split.

## Project Notes

- API token management UI is under `src/app/(dashboard)/settings/api-keys/page.tsx`
- Firebase rules are versioned in `firestore.rules` and `storage.rules`
- Existing AI routes remain under `src/app/api/ai`
