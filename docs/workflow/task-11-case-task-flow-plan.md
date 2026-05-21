# Task 11 Case Task Flow Plan

This document defines the Task 11 implementation scope for TaskTree v2 Case development.

TaskTree v2 Case work must follow `docs/core/case-collaboration-model.md`.

## Current Completed State

Task 10 added Case status update.

- `PUT /cases/{id}` API was added.
- `CaseService.updateCaseStatus` was added to `@task/core`.
- The Case detail screen shows status controls with loading and error states.

## Task 11 Goal

Task 11 adds the minimum task execution flow for a Case.

Users who are authorized to operate a Case should be able to create tasks under that Case and view the task list from the Case detail screen.

## Scope

Implemented in Task 11:

- Add `CaseTask` entity type to `@task/core` — separate from the existing v1 `Task` entity.
- Add `GET /cases/{id}/tasks` route, Lambda, and handler.
- Add `POST /cases/{id}/tasks` route, Lambda, and handler.
- Add `CaseService.getCaseTasks` and `CaseService.createCaseTask` to `@task/core`.
- Add task list and task creation form to `/dashboard/cases/[id]`.
- Show loading, empty, and error states for the task list.
- Show inline error for task creation failure.
- Add API tests for both handlers.

## Entity Design

`CaseTask` is a new DynamoDB entity, stored as:

```text
pk = "CaseTask"
sk = "Case#{caseId}#CaseTask#{taskId}"
```

The `byCase` GSI (already defined in the database stack) indexes CaseTask records:

```text
caseId       = caseId                                  (byCase GSI partition key)
caseSortKey  = "CaseTask#{status}#{updatedAt}#{taskId}" (byCase GSI sort key)
```

Querying tasks for a case uses:

```text
IndexName: "byCase"
KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)"
ExpressionAttributeValues: { ":caseId": caseId, ":prefix": "CaseTask#" }
```

No new GSI is needed. The existing `byCase` GSI is reused.

## Authorization Policy

### GET /cases/{id}/tasks

Read permission matches `getCase`:

- Caller is the Case creator.
- Caller is the Case owner when `ownerType = USER`.
- Case targets the caller directly with `targetScope = USER`.
- Case targets the caller's team with `targetScope = TEAM`.

### POST /cases/{id}/tasks

Write permission matches `updateCase`:

- Caller is the Case creator, or
- Case owner is `USER` and caller is that owner.

Both handlers also verify:

- Cognito JWT is present (401 if not).
- User profile is loaded from server (401 trusted source, not client).
- Case exists (404 if not).
- Case belongs to the same company as the caller (403 if not).

## API Contract

### GET /cases/{id}/tasks

Response `200`:

```json
[
  {
    "taskId": "string",
    "caseId": "string",
    "companyId": "string",
    "creatorId": "string",
    "assigneeId": "string | null",
    "title": "string",
    "description": "string",
    "status": "TODO",
    "dueDate": "string | null",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### POST /cases/{id}/tasks

Request body:

```json
{
  "title": "string",
  "description": "string",
  "dueDate": "string | null"
}
```

Response `201`:

```json
{ "taskId": "string" }
```

New tasks start with `status = TODO`. The `assigneeId` is `null` at creation.

## CaseTaskStatus

Defined separately from v1 `TaskStatus`:

```text
TODO
IN_PROGRESS
REVIEW_REQUESTED
DONE
ON_HOLD
CANCELED
```

## Out of Scope

Do not implement:

- Task status update
- Task assignee change
- Task deletion
- Task edit
- History automatic record
- Comment
- Approval flow
- Claim request
- Child case
- STANDARD / PROJECT creation UI
- OPEN case
- New DynamoDB GSI

## Deployment Impact

- Two new Lambda functions: `GetCaseTasksFunction`, `CreateCaseTaskFunction`
- Two new API routes: `GET /cases/{id}/tasks`, `POST /cases/{id}/tasks`
- `GetCaseTasksFunction`: DynamoDB `GetItem` + `Query` (read only)
- `CreateCaseTaskFunction`: DynamoDB `GetItem` + `Query` (read profile + case) + `PutItem` (create task)
- No new DynamoDB table or GSI

## Verification

```text
yarn.cmd type-check:core              passed
yarn.cmd type-check:api               passed
yarn.cmd workspace @task/app lint     passed
yarn.cmd workspace @task/app build    passed
yarn.cmd test:api                     15 files, 163 tests — all passed
yarn.cmd workspace @task/infra build  passed
```
