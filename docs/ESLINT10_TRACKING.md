# ESLint 10 Tracking

## Current State

The repository is clean on `eslint@9.39.4`.

`eslint@10.x` is intentionally deferred because the current `eslint-config-next` stack still resolves React lint plugins that fail at runtime under ESLint 10.

## Observed Failure

When `eslint` was upgraded to `10.0.3`, `npm run lint` failed with this runtime error:

```text
TypeError: Error while loading rule 'react/display-name': contextOrFilename.getFilename is not a function
```

The failure occurred inside the React lint stack bundled through `eslint-config-next`.

## Why This Is Deferred

The maintenance policy for this repository is:

- keep dependency drift small
- do not merge upgrades that break required CI
- document blocked upgrades instead of retrying them blindly

At the moment, `eslint@10` is the only intentionally deferred dependency.

## Unblock Condition

This upgrade can move forward only when all of these are true:

- `eslint-config-next` resolves plugin versions that are runtime-compatible with ESLint 10
- `npm run lint` passes without patching vendor packages
- `npm run test:run` continues to pass
- `npm run build` continues to pass

## Validation Checklist

When retrying the upgrade:

1. bump `eslint` and `eslint-config-next` in an isolated PR
2. run `npm run lint`
3. if lint passes, run `npm run test:run`
4. run `npm run build`
5. remove the deferred note from maintenance docs only after all checks pass

## Source Of Truth For This Deferment

The current deferment is tracked in:

- `scripts/dependency-health-report.mjs`
- `README.md`
- `docs/GITHUB_WORKFLOW.md`
- this document
