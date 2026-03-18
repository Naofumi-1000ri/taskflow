# Deployment

This repository deploys the production app after a merge to `main`.
The default production target in this repository is Vercel because no alternative app-hosting pipeline is versioned here today.

## Production Path

1. A change lands through a pull request.
2. `taskflow-ci` passes on the merged `main` commit.
3. `taskflow-deploy` runs from that successful `main` CI result.
4. The workflow builds and deploys the app to Vercel production.

The deploy workflow is intentionally post-merge. It is not a branch protection gate.

## Required Repository Configuration

Configure these repository secrets and variables before relying on production deploys.

Required secrets:

- `VERCEL_TOKEN`: token used by GitHub Actions to deploy the app
- `PROJECTV2_TOKEN`: token that can update the GitHub Project v2 item status

Required repository variables:

- `VERCEL_ORG_ID`: Vercel team or personal account id
- `VERCEL_PROJECT_ID`: Vercel project id for this app
- `GH_PROJECTV2_NUMBER`: the Project v2 number used for Issue tracking

Optional repository variable:

- `GH_PROJECTV2_OWNER`: the Project v2 owner login when the project does not live under the current repository owner

If the Vercel values are missing, `taskflow-deploy` exits without deploying.
If the Project v2 values are missing, `taskflow-project-automation` exits without changing issue status.

## GitHub Project Automation

`taskflow-project-automation` keeps linked Issues aligned with the delivery flow.

Automatic transitions:

- Issue `opened` or `reopened` -> `Backlog`
- PR `opened`, `reopened`, or `converted_to_draft` -> linked Issue `In Progress`
- PR `ready_for_review` -> linked Issue `Review`
- PR `closed` with merge -> linked Issue `Done`
- PR `closed` without merge -> linked Issue `Ready`

Linked Issues are detected from the PR body.
Use a closing reference such as `Closes #123` in every PR.

## Repository Settings

Keep these repository settings aligned with the automation:

- require pull requests for `main`
- require the `taskflow-ci` checks to pass before merge
- enable squash merge
- delete branch on merge

The deploy workflow assumes merges reach `main` only after CI has already passed on the PR.
