# Task 13 Case Claim Approval Flow Plan

This document defines the Task 13 implementation scope for TaskTree v2 Case development.

TaskTree v2 Case work must follow `docs/core/case-collaboration-model.md`.

Note: the current roadmap originally places `OPEN case and Claim flow` after STANDARD / PROJECT work. This plan intentionally moves the first Claim / Approval flow earlier so that Case ownership transfer can be validated before expanding larger Case hierarchies.

## Current Completed State

Task 12 added Case collaboration logs.

- Case detail screen can show Case history and comments.
- Authorized users can post Case comments.
- Case creation, Case status changes, and Case task creation record history automatically.
- History and comments reuse the existing `byCase` GSI.

## Task 13 Goal

Task 13 adds the first Case claim and approval workflow.

Users who can see an `OPEN` Case should be able to submit a claim request.
The Case creator or current USER owner should be able to approve or reject that request.
Approved claim requests should update the Case owner to the approved user and record history.

This task should keep the workflow small enough to verify safely:

- User-level claim only.
- Same-company users only.
- No external company participation yet.
- No new DynamoDB GSI.

## Scope

Implemented in Task 13:

- Add Claim Request types to `@task/core`.
- Add `CaseService.getCaseClaimRequests`.
- Add `CaseService.createCaseClaimRequest`.
- Add `CaseService.updateCaseClaimRequest`.
- Add `GET /cases/{id}/claim-requests`.
- Add `POST /cases/{id}/claim-requests`.
- Add `PUT /cases/{id}/claim-requests/{claimRequestId}`.
- Add Claim Request repository and DynamoDB record mapper.
- Add Claim Request UI to `/dashboard/cases/[id]`.
- Add request / approve / reject actions to Case detail screen.
- Record Case history for claim request, approval, and rejection.
- Add API tests for claim request handlers.
- Update README after implementation.

## Entity Design

### CaseClaimRequest

```text
pk = "CaseClaimRequest"
sk = "Case#{caseId}#ClaimRequest#{claimRequestId}"
```

The `byCase` GSI indexes Claim Request records:

```text
caseId       = caseId
caseSortKey  = "ClaimRequest#{status}#{createdAt}#{claimRequestId}"
```

No new GSI is needed.

Querying claim requests for a case:

```text
IndexName: "byCase"
KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)"
ExpressionAttributeValues: { ":caseId": caseId, ":prefix": "ClaimRequest#" }
```

## Core Types

Add these types in `packages/task-core/src/types/case.ts`.

```ts
export enum CaseClaimRequestStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface CaseClaimRequest {
  claimRequestId: string;
  caseId: string;
  companyId: string;
  requesterId: string;
  status: CaseClaimRequestStatus;
  message: string | null;
  rejectReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCaseClaimRequestInput {
  message?: string;
}

export interface UpdateCaseClaimRequestInput {
  status: CaseClaimRequestStatus.APPROVED | CaseClaimRequestStatus.REJECTED;
  rejectReason?: string;
}
```

## API Contract

### GET /cases/{id}/claim-requests

Returns claim requests for a Case.

Response `200`:

```json
[
  {
    "claimRequestId": "string",
    "caseId": "string",
    "companyId": "string",
    "requesterId": "string",
    "status": "PENDING",
    "message": "string | null",
    "rejectReason": "string | null",
    "reviewedBy": "string | null",
    "reviewedAt": "string | null",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### POST /cases/{id}/claim-requests

Creates a pending claim request.

Request body:

```json
{ "message": "string" }
```

`message` is optional. If present, it must be a non-empty string after trimming.
Unexpected fields must return `400`.

Response `201`:

```json
{ "claimRequestId": "string" }
```

### PUT /cases/{id}/claim-requests/{claimRequestId}

Approves or rejects a pending claim request.

Request body:

```json
{
  "status": "APPROVED | REJECTED",
  "rejectReason": "string"
}
```

Rules:

- `status` must be `APPROVED` or `REJECTED`.
- `rejectReason` is required when `status = REJECTED`.
- `rejectReason` is not allowed when `status = APPROVED`.
- Unexpected fields must return `400`.

Response `200`:

```json
{ "claimRequestId": "string" }
```

## Authorization Policy

All handlers must verify:

- Cognito JWT is present.
- User profile is loaded from server-side repository.
- Case exists.
- Case belongs to the caller's company.

### Create Claim Request

Allowed when:

- Case `deliveryType` is `OPEN`.
- Caller can view the Case.
- Caller is not already the Case creator.
- Caller is not already the USER owner.
- There is no existing `PENDING` claim request from the same requester for the same Case.

Rejected when:

- Case is `DIRECT`.
- Caller has no Case read access.
- Caller already has a pending request.
- Request body has unsupported fields.

### List Claim Requests

Allowed when:

- Caller is the Case creator.
- Caller is the current USER owner.
- Caller has a claim request on the Case.

This prevents unrelated users who can merely view an OPEN Case from seeing other users' claim requests.

### Approve / Reject Claim Request

Allowed when:

- Caller is the Case creator.
- Or caller is the current USER owner.

Approval behavior:

- Claim Request status becomes `APPROVED`.
- `reviewedBy`, `reviewedAt`, and `updatedAt` are updated.
- Case `ownerType` becomes `USER`.
- Case `ownerId` becomes `requesterId`.
- Case `status` becomes `IN_PROGRESS` if it is currently `WAITING`.
- Other `PENDING` claim requests for the same Case should be marked `REJECTED` with a system reject reason.
- Case history records `CLAIM_APPROVED`.

Rejection behavior:

- Claim Request status becomes `REJECTED`.
- `rejectReason`, `reviewedBy`, `reviewedAt`, and `updatedAt` are updated.
- Case owner is not changed.
- Case history records `CLAIM_REJECTED`.

## History Auto-Recording

Add these `CaseHistoryAction` values:

```text
CLAIM_REQUESTED
CLAIM_APPROVED
CLAIM_REJECTED
```

History detail examples:

```text
Claim requested by {requesterId}
Claim approved for {requesterId}
Claim rejected for {requesterId}
```

History write failures should be logged and should not fail the main operation.

## UI Scope

Update `/dashboard/cases/[id]`.

Add a Claim section:

- Show claim request loading state.
- Show current pending / approved / rejected requests relevant to the user.
- For eligible users, show "claim request" action.
- For creator / owner, show approve and reject controls for pending requests.
- Show inline errors.
- Disable buttons while submitting.
- Refresh Case detail, claim requests, and history after approval or rejection.

Keep UI simple. Do not add a separate page.

## Out of Scope

Do not implement:

- External company participation.
- Participant company records.
- Claim request by team or company.
- OPEN case discovery page.
- STANDARD / PROJECT creation UI.
- Child case creation.
- Task approval flow.
- Comment edit or delete.
- New DynamoDB GSI.

## Deployment Impact

- New Lambda functions:
  - `GetCaseClaimRequestsFunction`
  - `CreateCaseClaimRequestFunction`
  - `UpdateCaseClaimRequestFunction`
- New API routes:
  - `GET /cases/{id}/claim-requests`
  - `POST /cases/{id}/claim-requests`
  - `PUT /cases/{id}/claim-requests/{claimRequestId}`
- DynamoDB:
  - No table change.
  - No new GSI.
  - Reuse `byCase`.
- IAM:
  - Read handler needs `GetItem` + `Query`.
  - Create handler needs `GetItem` + `Query` + `PutItem`.
  - Update handler needs `GetItem` + `Query` + `PutItem`.

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
