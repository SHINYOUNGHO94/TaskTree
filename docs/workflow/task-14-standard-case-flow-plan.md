# Task 14 Standard Case Flow Plan

This document defines the Task 14 implementation scope for TaskTree v2 Case development.

TaskTree v2 Case work must follow `docs/core/case-collaboration-model.md`.

## Current Completed State

Task 13 added the first Claim / Approval flow.

- Users can submit claim requests for eligible `OPEN` cases.
- Case creator or current USER owner can approve or reject claim requests.
- Claim request, approval, and rejection are recorded in Case history.
- Case detail now includes task, history, comment, and claim request sections.

## Task 14 Goal

Task 14 adds the first STANDARD case workflow.

Users should be able to create a `STANDARD` case and break it down into smaller child `REQUEST` cases or Case tasks.
The Case detail screen should show child cases and existing Case tasks so a larger internal work item can be managed from one place.

This task focuses on same-company internal workflow only.

## Scope

Implemented in Task 14:

- Allow root `STANDARD` case creation.
- Add child `REQUEST` case creation under a parent `STANDARD` case.
- Add child case list API for a parent case.
- Add `CaseService.getChildCases`.
- Add `CaseService.createChildCase`.
- Add STANDARD case creation UI.
- Add child REQUEST case creation UI on STANDARD case detail.
- Add child case list section on Case detail.
- Record history for child case creation.
- Add API tests for child case handlers and STANDARD creation validation.
- Update README after implementation.

## Case Type Rules

### Root STANDARD Case

Allowed:

- `caseType = STANDARD`
- `parentCaseId = null`
- `projectId = null`
- `deliveryType = DIRECT` or `OPEN`
- `ownerType = USER`
- Same-company internal target only.

Root STANDARD creation should reuse the existing `POST /cases` route if possible.

### Child REQUEST Case

Allowed:

- Parent case must exist.
- Parent case must belong to the caller's company.
- Parent case must have `caseType = STANDARD`.
- Child case must have `caseType = REQUEST`.
- Child case must have `parentCaseId = parentCase.caseId`.
- Child case inherits `projectId` from parent case.
- Child case must stay in the same company as the parent.

Rejected:

- Child case under `REQUEST`.
- Child case under nonexistent parent.
- Child case under another company.
- `PROJECT` creation.
- Nested child case deeper than one level in this task.

## API Contract

### GET /cases/{id}/children

Returns child cases for a parent case.

Response `200`:

```json
[
  {
    "caseId": "string",
    "title": "string",
    "description": "string",
    "caseType": "REQUEST",
    "status": "WAITING",
    "deliveryType": "DIRECT | OPEN",
    "ownerType": "USER",
    "ownerId": "string",
    "targetScope": "USER | TEAM",
    "targetScopeId": "string",
    "requiredRole": "USER | TEAM_ADMIN | DEPT_ADMIN | DIVISION_ADMIN | COMPANY_ADMIN",
    "companyId": "string",
    "divisionId": "string",
    "departmentId": "string",
    "teamId": "string",
    "creatorId": "string",
    "projectId": "string | null",
    "parentCaseId": "string",
    "dueDate": "string | null",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### POST /cases/{id}/children

Creates a child `REQUEST` case under a parent `STANDARD` case.

Request body:

```json
{
  "title": "string",
  "description": "string",
  "deliveryType": "DIRECT | OPEN",
  "targetScope": "USER | TEAM",
  "targetScopeId": "string",
  "requiredRole": "USER | TEAM_ADMIN",
  "dueDate": "string | null"
}
```

Rules:

- `title` and `description` must be non-empty strings after trimming.
- `deliveryType`, `targetScope`, and `requiredRole` must be supported values.
- `targetScope = USER` requires `targetScopeId` to be the target user id.
- `targetScope = TEAM` requires `targetScopeId` to be the caller's team id for this task.
- Unexpected fields must return `400`.

Response `201`:

```json
{ "caseId": "string" }
```

## Authorization Policy

All handlers must verify:

- Cognito JWT is present.
- User profile is loaded from server-side repository.
- Parent case exists.
- Parent case belongs to the caller's company.

### GET /cases/{id}/children

Allowed when caller can view the parent case:

- Caller is the parent Case creator.
- Caller is the parent Case USER owner.
- Parent Case targets the caller directly with `targetScope = USER`.
- Parent Case targets the caller's team with `targetScope = TEAM`.

### POST /cases/{id}/children

Allowed when:

- Caller is the parent Case creator.
- Or caller is the parent Case USER owner.

This matches the current Case task creation policy and keeps breakdown authority limited.

## DynamoDB Access Pattern

Reuse the existing `byCase` GSI.

Child case records should be indexed under the parent case:

```text
caseId       = parentCaseId
caseSortKey  = "ChildCase#{status}#{updatedAt}#{childCaseId}"
```

The child case itself still keeps its own `caseId` as the entity's primary case id.

No new GSI should be added.

## History Auto-Recording

Add or reuse a Case history action for child case creation.

Recommended action:

```text
CHILD_CASE_CREATED
```

History should be written to the parent case:

```text
Child case created: {title}
```

History write failures should be logged and should not fail the main operation.

## UI Scope

### Dashboard

Update the Case creation modal or flow so users can choose:

- `REQUEST`
- `STANDARD`

Do not implement `PROJECT` creation in this task.

For `STANDARD`, allow the user to input:

- title
- description
- delivery type
- target scope
- target user/team
- required role
- due date

Keep the UI compact. Do not create a separate landing page.

### Case Detail

Add a child case section.

For every case:

- Show child cases if any exist.
- Show loading / empty / error states.

For `STANDARD` case:

- Show child REQUEST creation form when caller is creator or USER owner.
- After child creation, refresh child case list and history.

For `REQUEST` case:

- Do not show child creation form.

## Out of Scope

Do not implement:

- PROJECT creation.
- PROJECT -> STANDARD -> REQUEST tree.
- Nested child case deeper than STANDARD -> REQUEST.
- Child case status aggregation into parent.
- Completion approval flow.
- Task approval flow.
- External company participation.
- New DynamoDB GSI.
- New top-level route for project detail.

## Deployment Impact

- New Lambda functions:
  - `GetChildCasesFunction`
  - `CreateChildCaseFunction`
- New API routes:
  - `GET /cases/{id}/children`
  - `POST /cases/{id}/children`
- DynamoDB:
  - No table change.
  - No new GSI.
  - Reuse `byCase`.
- IAM:
  - Read handler needs `GetItem` + `Query`.
  - Create handler needs `GetItem` + `Query` + `PutItem`.

## Verification

Run at minimum:

```text
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
yarn.cmd test:api
```

Also check source files for:

```text
as any
eslint-disable
no-explicit-any
Korean text in source code
```
