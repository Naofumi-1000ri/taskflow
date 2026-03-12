# Security Policy

## Supported Branch

The supported branch for security fixes is:

- `main`

## Reporting A Vulnerability

Do not open a public GitHub Issue for a suspected security vulnerability.

Instead:

1. prepare a minimal report with impact, affected area, reproduction steps, and any proof-of-concept details
2. share it privately with the repository maintainers through the channel agreed by the team
3. wait for confirmation before disclosing details publicly

If the issue affects a third-party dependency, include:

- package name and version
- advisory link if available
- whether a patched version exists

## Patch Expectations

Security fixes should:

- land through a pull request
- include verification steps
- update dependency locks when relevant
- document follow-up work if a full fix must be staged

## Dependency Maintenance

This repository uses:

- GitHub Actions `audit`, `lint`, `test`, `build`, and `e2e-smoke` checks
- Dependabot for weekly npm and GitHub Actions update PRs

Dependency PRs should stay small and pass the full CI baseline before merge.
