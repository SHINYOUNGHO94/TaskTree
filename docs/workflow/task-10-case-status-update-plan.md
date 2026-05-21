# Task 10 Case Status Update Plan

This document defines the Task 10 implementation scope for TaskTree v2 Case development.

TaskTree v2 Case work must follow `docs/core/case-collaboration-model.md`.

## Current Completed State

Task 9 added read-only Case detail.

- `GET /cases/{id}` API was added.
- `CaseService.getCase` was added to `@task/core`.
- `/dashboard/cases/[id]` shows Case detail.
- Dashboard Case cards navigate to the detail page.
- Server-side `getCase` checks authentication, company boundary, and the minimum allowed reader set.

## Task 10 Goal

Task 10 adds Case status update.

Users who are allowed to operate a Case should be able to change its status from the Case detail screen.

Task 10 must stay focused on status only.

## Scope

Implement the following:

- Add an API handler for updating Case status.
- Add `PUT /cases/{id}` route and Lambda.
- Add `CaseService.updateCaseStatus`.
- Add status controls to `/dashboard/cases/[id]`.
- Refresh the detail view after a successful status update.
- Show loading and error states for the status update action.
- Add API tests for authorization and validation.

## API Contract

Use:

```text
PUT /cases/{id}
```

Request body:

```json
{
  "status": "IN_PROGRESS"
}
```

Response body:

```json
{
  "caseId": "..."
}
```

Task 10 should not update title, description, dueDate, owner, targetScope, requiredRole, projectId, or parentCaseId.

## Authorization Policy

Task 10 should use a smaller mutation permission than read permission.

Allow status update only when:

- Caller belongs to the same company as the Case.
- Caller is the Case creator, or
- Case owner is `USER` and caller is that owner.

Do not allow every `TEAM` target member to update status yet.

Future tasks may expand mutation permission when assignment and owner-group responsibilities are formalized.

## Out of Scope

Do not implement:

- History automatic record
- Comment
- Approval flow
- Reject reason
- Claim request
- Owner change
- Assignment record
- Visibility record
- Child case
- Case task creation
- New DynamoDB GSI

## Deployment Impact

Task 10 changes API Gateway, Lambda, and IAM.

Expected impact:

- New Lambda: `UpdateCaseFunction`
- New route: `PUT /cases/{id}`
- DynamoDB read/write permission for the new Lambda

No new DynamoDB table or GSI should be required.

## Verification

Run:

```text
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd test:api
```

Manual check if possible:

- Case detail page shows status controls.
- Status update succeeds for creator or USER owner.
- Status update failure shows an inline error.
- Detail screen reflects the new status after update.

