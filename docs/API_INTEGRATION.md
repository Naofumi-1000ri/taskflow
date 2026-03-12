# API Integration Guide

## Bootstrap

There are two auth modes in TaskFlow:

1. Firebase ID token for first-party authenticated UI requests
2. personal access token with `tf_` prefix for external integrations

External tools should use a PAT for normal project and task operations.

To create a PAT you can either:

- use the settings UI at `/settings/api-keys`
- call the token management API with a Firebase ID token from a signed-in user session

## Token Creation

### Create a PAT with a Firebase ID token

```bash
curl -X POST http://localhost:3000/api/auth/tokens \
  -H "Authorization: Bearer $FIREBASE_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local CLI",
    "permissions": ["projects:read", "tasks:read", "tasks:write"],
    "projectIds": null,
    "expiresAt": null
  }'
```

Example response:

```json
{
  "apiKey": {
    "id": "token_123",
    "name": "Local CLI",
    "keyPrefix": "tf_abc123def...",
    "userId": "user_123",
    "permissions": ["projects:read", "tasks:read", "tasks:write"],
    "projectIds": null,
    "createdAt": "2026-03-12T04:00:00.000Z",
    "lastUsedAt": null,
    "expiresAt": null,
    "isActive": true,
    "keyHash": ""
  },
  "plainTextKey": "tf_abcdefghijklmnopqrstuvwxyz123456"
}
```

The full `plainTextKey` is only returned once. Store it securely.

## Project Discovery

### List visible projects

```bash
curl http://localhost:3000/api/projects \
  -H "Authorization: Bearer $TASKFLOW_PAT"
```

### Get project status

```bash
curl http://localhost:3000/api/projects/$PROJECT_ID/status \
  -H "Authorization: Bearer $TASKFLOW_PAT"
```

### Get project lists

Resolve a `listId` before creating tasks.

```bash
curl http://localhost:3000/api/projects/$PROJECT_ID/lists \
  -H "Authorization: Bearer $TASKFLOW_PAT"
```

## Task Read And Write

### List project tasks

```bash
curl http://localhost:3000/api/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TASKFLOW_PAT"
```

### Create a task

```bash
curl -X POST http://localhost:3000/api/projects/$PROJECT_ID/tasks \
  -H "Authorization: Bearer $TASKFLOW_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write integration guide",
    "description": "Document PAT usage and curl examples",
    "listId": "'"$LIST_ID"'",
    "priority": "high",
    "assigneeIds": [],
    "labelIds": [],
    "tagIds": [],
    "dependsOnTaskIds": [],
    "startDate": null,
    "dueDate": null,
    "durationDays": null,
    "isDueDateFixed": false
  }'
```

### Update a task

```bash
curl -X PATCH http://localhost:3000/api/projects/$PROJECT_ID/tasks/$TASK_ID \
  -H "Authorization: Bearer $TASKFLOW_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write and review integration guide",
    "isCompleted": false,
    "priority": "medium"
  }'
```

### Archive a task

```bash
curl -X DELETE http://localhost:3000/api/projects/$PROJECT_ID/tasks/$TASK_ID \
  -H "Authorization: Bearer $TASKFLOW_PAT"
```

### Restore an archived task

```bash
curl -X POST http://localhost:3000/api/projects/$PROJECT_ID/tasks/$TASK_ID/restore \
  -H "Authorization: Bearer $TASKFLOW_PAT"
```

## Token Scope Model

PAT access is limited by all of the following:

- token permissions
- token project scope
- project membership
- member role

Useful permission combinations:

- read-only integration:
  `["projects:read", "tasks:read"]`
- task automation:
  `["projects:read", "tasks:read", "tasks:write"]`
- broad admin:
  `["admin"]`

`tasks:write` does not bypass project membership. A viewer-level member still cannot mutate tasks.

## Common Errors

### `401 Unauthorized`

Causes:

- missing bearer token
- malformed Firebase ID token
- invalid or inactive PAT
- expired PAT

### `403 Forbidden`

Causes:

- missing required PAT permission
- token scoped away from the target project
- user is not allowed to mutate the target project

### `404 Not Found`

Causes:

- missing project
- missing task
- resource exists but is not reachable through the authenticated user context

### `409 Conflict`

Used for invalid state transitions such as restoring a task that is not archived.

## Recommended Client Flow

1. create or obtain a PAT
2. call `GET /api/projects`
3. pick a project and call `GET /api/projects/[projectId]/lists`
4. call read or write task routes with the resolved `projectId` and `listId`
5. handle `401`, `403`, `404`, and `409` distinctly
