# TaskFlow GitHub Triage

This project uses TaskFlow as the runtime backlog and GitHub as the implementation and review source of truth.

When a TaskFlow board task is brought into GitHub, do not mirror it verbatim without triage.

## Triage Goal

Before implementation starts, classify each imported task into one of these buckets:

- `already implemented`
- `partially implemented`
- `reproducible gap`
- `needs clarification`

This prevents the team from treating ambiguous human requests as clean engineering tasks.

## Required Triage Pass

For every TaskFlow task imported into GitHub:

1. inspect the current UI, API, or code path
2. decide whether the request is already satisfied
3. leave an `AI triage` comment on the GitHub Issue
4. only then decide whether to keep, split, close, or implement the Issue

## Comment Template

Each triage comment should include:

- the current classification
- what is already implemented today
- what is still missing
- what needs clarification, if anything
- the acceptance gap if implementation is still needed

Preferred opening lines:

- `AI triage: already implemented`
- `AI triage: partially implemented`
- `AI triage: reproducible gap`
- `AI triage: needs clarification`

## Interpretation Rules

When a human writes a vague request such as:

- `hard to align`
- `I want more file types`
- `doesn't change`

do not convert it straight into a feature or bug without interpretation.

Instead:

- identify the current implementation that already exists
- separate UX pain from missing functionality
- split follow-up issues when a vague request actually mixes multiple concerns

Example:

- `header alignment is hard`
  - could mean the crop UI exists but is awkward
  - could mean saved images cannot be re-positioned later
  - these are different issues and should not be merged blindly

## Close Rules

Close the GitHub Issue when:

- current code already satisfies the request
- the TaskFlow task is stale and no longer reflects current behavior
- the real request was split into clearer follow-up issues

When closing as implemented, leave a comment with the current code path or screen behavior that satisfies it.

## Documentation Expectation

Because this repository is explicitly blending project management and development:

- preserve source TaskFlow task IDs in the GitHub Issue body
- preserve the source board URL when possible
- document the triage decision in the Issue thread
- document any new workflow rule in repository docs when the process changes
