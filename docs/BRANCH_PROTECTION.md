# Branch Protection Checklist

Apply these settings to `main` in GitHub repository settings.

## Required

- require a pull request before merging
- require approvals: 1 or more
- require approval of the most recent reviewable push
- require conversation resolution before merge
- require status checks before merge
- include administrators if you want a strict gate
- block direct pushes

## Status Checks

Start with:

- `test`

Where `test` is the job name from `.github/workflows/taskflow-ci.yml`.

Do not require lint yet. The repository still has existing lint debt outside the current feature scope.

## Optional

- require branches to be up to date before merging
- require signed commits if your team needs it
- disable force pushes
- disable branch deletion

## When To Tighten Rules

Add more required checks after the baseline is stable:

- lint
- build
- e2e smoke tests

Tighten only after those checks are reliable enough not to create constant false failures.
