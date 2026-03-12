# Labels And Milestones

## Labels

Use a small stable label set.

### Work Type

- `feature`: new capability
- `bug`: defect or regression
- `tech-debt`: cleanup or refactor with no intended behavior change
- `docs`: documentation-only work

### Area

- `api`
- `frontend`
- `backend`
- `firebase`
- `ai`
- `auth`

### Risk / Coordination

- `security`
- `breaking-change`
- `needs-design`
- `needs-product`
- `blocked`

## Milestones

Create milestones only when one of these is true:

- there is a target release
- there is a theme spanning multiple Issues
- there is work with a clear deadline

Avoid creating milestones for one-off tasks.

## Suggested Current Milestones

- `PAT and external API`
- `GitHub source-of-truth rollout`
- `Lint debt reduction`
- `Frontend interaction cleanup`

## Mapping Guidance

Examples:

- PAT auth route cleanup:
  `tech-debt`, `api`, `auth`
- new task archive endpoint:
  `feature`, `api`, `backend`
- React hook lint fixes:
  `tech-debt`, `frontend`
