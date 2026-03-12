# E2E Strategy

## Goal

Keep one fast, deterministic Playwright gate in CI while leaving room for broader Firebase-backed end-to-end coverage locally.

## Test Modes

### Required CI smoke

`npm run test:e2e:smoke`

This runs two browser passes:

- unauthenticated smoke:
  verifies `/login` and protected-route redirect behavior
- authenticated smoke:
  enables `NEXT_PUBLIC_E2E_MOCK_AUTH=true` and verifies a logged-in settings path without external Firebase state

The smoke runner injects dummy Firebase config and disables the existing Firebase test-auth flow, so it does not require secrets or a shared backend.

## Mock Auth Mode

Mock auth mode is only intended for localhost Playwright smoke coverage.

Behavior:

- `AuthProvider` injects a deterministic mock user
- Firestore initialization is skipped
- project and notification subscriptions short-circuit to empty state

This is intentionally narrow. It exists to prove authenticated layout and routing behavior, not to simulate full Firebase functionality.

## Firebase-backed local suite

`npm run test:e2e`

The broader Playwright suite still targets a real local Firebase-backed environment and may use:

- `NEXT_PUBLIC_ENABLE_TEST_AUTH=true`
- real Firebase client config in `.env.local`
- a shared or seeded backend state

Use it for flows like:

- project creation
- board interaction
- task editing
- calendar and gantt behavior

## Expansion Plan

Near-term target:

- keep the required smoke suite fast and secrets-free
- add one isolated authenticated happy path at a time

Longer-term target:

- move Firebase-dependent E2E coverage onto emulators or seeded disposable data
- stop relying on shared manual backend state for core user flows

## Acceptance Bar For New Required E2E Coverage

Only promote a Playwright flow into required CI when all of these are true:

- no shared mutable backend state is required
- no manual secrets are required beyond the existing repo baseline
- the flow is deterministic under single-worker CI execution
- failures produce useful artifacts and are easy to reproduce locally
