# Task 12 Case Collaboration Log Plan

This document defines the Task 12 implementation scope for TaskTree v2 Case development.

TaskTree v2 Case work must follow `docs/core/case-collaboration-model.md`.

## Current Completed State

Task 11 added the Case task execution flow.

- `GET /cases/{id}/tasks` and `POST /cases/{id}/tasks` APIs were added.
- `CaseTask` entity was added as a separate entity from v1 `Task`.
- `CaseService.getCaseTasks` and `CaseService.createCaseTask` were added to `@task/core`.
- The Case detail screen shows a task list and a task creation form.

## Task 12 Goal

Task 12 adds Case collaboration logging.

Users who are authorized to view a Case should be able to see its history and comments.
History is recorded automatically when the Case is created, its status is changed, or a task is created under it.
Authorized users can write comments on a Case.

## Scope

Implemented in Task 12:

- Add `CaseHistoryAction`, `CaseHistoryEntry`, `CaseComment`, `CreateCaseCommentInput` types to `@task/core`.
- Add `GET /cases/{id}/history` route, Lambda, and handler.
- Add `GET /cases/{id}/comments` route, Lambda, and handler.
- Add `POST /cases/{id}/comments` route, Lambda, and handler.
- Add `CaseService.getCaseHistory`, `CaseService.getCaseComments`, `CaseService.createCaseComment` to `@task/core`.
- Write history automatically in `createCase`, `updateCase`, and `createCaseTask` handlers.
- Add History section and Comment section to `/dashboard/cases/[id]`.
- Show loading, empty, and error states for both sections.
- Show inline error for comment submission failure.
- Add API tests for three new handlers.

## Entity Design

### CaseHistory

```text
pk = "CaseHistory"
sk = "Case#{caseId}#CaseHistory#{historyId}"
```

The `byCase` GSI indexes CaseHistory records:

```text
caseId       = caseId                                   (byCase GSI partition key)
caseSortKey  = "CaseHistory#{createdAt}#{historyId}"    (byCase GSI sort key)
```

### CaseComment

```text
pk = "CaseComment"
sk = "Case#{caseId}#CaseComment#{commentId}"
```

The `byCase` GSI indexes CaseComment records:

```text
caseId       = caseId                                   (byCase GSI partition key)
caseSortKey  = "CaseComment#{createdAt}#{commentId}"    (byCase GSI sort key)
```

No new GSI is needed. The existing `byCase` GSI is reused for both entity types.

Querying history for a case:

```text
IndexName: "byCase"
KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)"
ExpressionAttributeValues: { ":caseId": caseId, ":prefix": "CaseHistory#" }
```

Querying comments for a case:

```text
IndexName: "byCase"
KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)"
ExpressionAttributeValues: { ":caseId": caseId, ":prefix": "CaseComment#" }
```

## History Auto-Recording

History is written server-side only. Clients cannot create history records.

| Trigger | Action | Detail |
|---------|--------|--------|
| `createCase` | `CASE_CREATED` | `"Case created"` |
| `updateCase` | `STATUS_CHANGED` | `"Status changed from {old} to {new}"` |
| `createCaseTask` | `TASK_CREATED` | `"Task created: {title}"` |

History write failures are swallowed silently. The main operation response is returned regardless.

## Authorization Policy

### GET /cases/{id}/history and GET /cases/{id}/comments

Read permission matches `getCaseTasks`:

- Caller is the Case creator.
- Caller is the Case owner when `ownerType = USER`.
- Case targets the caller directly with `targetScope = USER`.
- Case targets the caller's team with `targetScope = TEAM`.

### POST /cases/{id}/comments

Same read permission as above. Any user who can view the Case can post comments.

All handlers also verify:

- Cognito JWT is present (401 if not).
- User profile is loaded from server (401 trusted source, not client).
- Case exists (404 if not).
- Case belongs to the same company as the caller (403 if not).

## API Contract

### GET /cases/{id}/history

Response `200`:

```json
[
  {
    "historyId": "string",
    "caseId": "string",
    "companyId": "string",
    "actorId": "string",
    "action": "CASE_CREATED | STATUS_CHANGED | TASK_CREATED",
    "detail": "string",
    "createdAt": "string"
  }
]
```

### GET /cases/{id}/comments

Response `200`:

```json
[
  {
    "commentId": "string",
    "caseId": "string",
    "companyId": "string",
    "authorId": "string",
    "content": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### POST /cases/{id}/comments

Request body:

```json
{ "content": "string" }
```

Response `201`:

```json
{ "commentId": "string" }
```

Content must be a non-empty string. `authorId` and `companyId` are determined server-side only.

## Out of Scope

Do not implement:

- History for task status changes, title changes, or assignee changes
- Comment edit or delete
- Approval flow
- Reject reason
- Claim request
- OPEN case
- Child case
- STANDARD / PROJECT creation UI
- New DynamoDB GSI

## Deployment Impact

- Three new Lambda functions: `GetCaseHistoryFunction`, `GetCaseCommentsFunction`, `CreateCaseCommentFunction`
- Three new API routes: `GET /cases/{id}/history`, `GET /cases/{id}/comments`, `POST /cases/{id}/comments`
- `GetCaseHistoryFunction`: DynamoDB `GetItem` + `Query` (read only)
- `GetCaseCommentsFunction`: DynamoDB `GetItem` + `Query` (read only)
- `CreateCaseCommentFunction`: DynamoDB `GetItem` + `Query` + `PutItem`
- `CreateCaseFunction`, `UpdateCaseFunction`, `CreateCaseTaskFunction`: existing IAM permissions already cover history `PutItem`
- No new DynamoDB table or GSI

## Verification

```text
yarn.cmd type-check:core              passed
yarn.cmd type-check:api               passed
yarn.cmd workspace @task/app lint     passed
yarn.cmd workspace @task/app build    passed
yarn.cmd test:api                     18 files, 191 tests — all passed
yarn.cmd workspace @task/infra build  passed
```
