# AI Access Control

TaskFlow supports per-project AI access control for the first-party Companion AI.

## Current Behavior

- AI provider keys remain user-level settings.
- AI project access is also user-level, but scoped by project.
- The AI settings screen shows a checkbox for each project the user can access.

## Persistence

- Route: `GET /api/ai/settings`
- Route: `PATCH /api/ai/settings`
- Storage: `users/{userId}/settings/aiSettings.allowedProjectIds`

## Semantics

- `allowedProjectIds = null`
  - AI can access all current and future projects for that user.
- `allowedProjectIds = ["project-a", "project-b"]`
  - AI can only access the listed projects.
  - Other projects are excluded from personal-scope AI context and tools.
  - Project-scoped AI is disabled on excluded projects.

## Enforcement Points

- Settings UI: checkbox selection per project
- Companion AI UI: disabled state and guidance when a project is excluded
- Chat API: rejects project-scoped requests for excluded projects
- Personal-scope AI context: filtered to the allowed project subset

## First Iteration Limits

- Access control is ON/OFF per project only.
- No read-only/tools-only/full-access levels yet.
- External PAT permissions are separate from Companion AI access settings.
