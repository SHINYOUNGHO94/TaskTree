# Task 15 Project Hierarchy Flow Plan

This document defines the Task 15 implementation scope for TaskTree v2 Case development.

TaskTree v2 Case work must follow `docs/core/case-collaboration-model.md`.

## Current Completed State

Task 14 added the first STANDARD case workflow.

- Users can create root `REQUEST` and `STANDARD` cases from the dashboard.
- Users can create child `REQUEST` cases under a `STANDARD` case.
- Case detail shows child cases, Case tasks, history, comments, and claim requests.
- Child case creation is recorded in Case history.
- Child case queries reuse the existing `byCase` GSI.

## Task 15 Goal

Task 15 adds the first PROJECT hierarchy flow.

Users should be able to create a root `PROJECT` case, create child `STANDARD` cases under it, and inspect the hierarchy from the existing Case detail screen.

This task keeps PROJECT as a `CaseType.PROJECT` root case in the existing Case entity model.
Do not introduce a separate Project entity or a new Project table in Task 15.

The target hierarchy is:

```text
PROJECT case
  -> STANDARD child case
    -> REQUEST child case
      -> Case task
```

This task also fixes the missing DynamoDB IAM permission for the existing claim approval transaction.

## Scope

Implemented in Task 15:

- Allow root `PROJECT` case creation through the existing `POST /cases` route.
- Add PROJECT creation UI to the existing dashboard Case creation modal.
- Extend child case creation so:
  - `PROJECT` parent creates `STANDARD` child cases.
  - `STANDARD` parent creates `REQUEST` child cases.
- Keep `REQUEST` cases unable to create child cases.
- Show PROJECT hierarchy on the existing `/dashboard/cases/[id]` page.
- For PROJECT detail, show child STANDARD cases and each STANDARD case's child REQUEST cases.
- Record history for child STANDARD creation under a PROJECT case.
- Add API tests for PROJECT creation and PROJECT child case rules.
- Fix `UpdateCaseClaimRequestFunction` IAM by adding `dynamodb:TransactWriteItems`.
- Update README after implementation.

## Case Type Rules

### Root PROJECT Case

Allowed:

- `caseType = PROJECT`
- `parentCaseId = null`
- `projectId = null`
- `deliveryType = DIRECT` or `OPEN`
- `ownerType = USER`
- Same-company internal target only.

Root PROJECT creation should reuse the existing `POST /cases` route.

PROJECT creation must use the same server-side creator profile, target scope, and required role validation as existing root `REQUEST` and `STANDARD` creation.

### Child STANDARD Case Under PROJECT

Allowed:

- Parent case must exist.
- Parent case must belong to the caller's company.
- Parent case must have `caseType = PROJECT`.
- Child case must have `caseType = STANDARD`.
- Child case must have `parentCaseId = parentProject.caseId`.
- Child case must have `projectId = parentProject.caseId`.
- Child case must stay in the same company as the parent PROJECT.

Rejected:

- STANDARD child under `REQUEST`.
- PROJECT child under any parent.
- Child case under nonexistent parent.
- Child case under another company.

### Child REQUEST Case Under STANDARD

Keep the Task 14 behavior:

- Parent case must have `caseType = STANDARD`.
- Child case must have `caseType = REQUEST`.
- Child case must have `parentCaseId = parentStandard.caseId`.
- Child case inherits `projectId` from the parent STANDARD case.
- If the STANDARD case is under a PROJECT, the REQUEST child's `projectId` must remain the PROJECT case id.

## API Contract

### POST /cases

Update existing root case creation to allow:

```json
{
  "title": "string",
  "description": "string",
  "caseType": "REQUEST | STANDARD | PROJECT",
  "deliveryType": "DIRECT | OPEN",
  "targetScope": "COMPANY | DIVISION | DEPARTMENT | TEAM | USER",
  "targetScopeId": "string",
  "requiredRole": "USER | TEAM_ADMIN | DEPT_ADMIN | DIVISION_ADMIN | COMPANY_ADMIN",
  "dueDate": "string | null"
}
```

Rules:

- `projectId` and `parentCaseId` are still not accepted on root creation.
- Server sets `projectId = null` and `parentCaseId = null` for root PROJECT cases.
- Unexpected fields must continue to be rejected.

### GET /cases/{id}/children

Keep the existing route.

For PROJECT parents, it returns direct child STANDARD cases.
For STANDARD parents, it returns direct child REQUEST cases.
For REQUEST parents, it returns an empty list unless a later task changes the model.

### POST /cases/{id}/children

Keep the existing route.

The request body should stay compact. The child case type is inferred from the parent:

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

- If parent is `PROJECT`, create a `STANDARD` child case.
- If parent is `STANDARD`, create a `REQUEST` child case.
- If parent is `REQUEST`, return `400`.
- `targetScope = USER` requires a real same-company, same-team user for this task.
- `targetScope = TEAM` requires the caller's own team id for this task.
- Unexpected fields must return `400`.

Response `201`:

```json
{ "caseId": "string" }
```

## Authorization Policy

All handlers must verify:

- Cognito JWT is present.
- User profile is loaded from server-side repository.
- Parent case exists for child creation.
- Case belongs to the caller's company.

### Root PROJECT Creation

Use the same authorization policy as existing root case creation.

The caller's role decides allowed `targetScope`.
`requiredRole` must not exceed the caller's role.
The server must not trust client-supplied `companyId`, `creatorId`, `ownerId`, `projectId`, or `parentCaseId`.

### Child Case Creation

Allowed when:

- Caller is the parent Case creator.
- Or caller is the parent Case USER owner.

This matches the current Case task and child case creation policy.

## DynamoDB Access Pattern

Reuse the existing `byCase` GSI.

Root PROJECT case:

```text
pk          = "Case"
sk          = "Case#{projectCaseId}"
caseId      = projectCaseId
caseSortKey = "Meta#Case#{projectCaseId}"
projectId   = null
parentCaseId = null
```

STANDARD child under PROJECT:

```text
pk          = "Case"
sk          = "Case#{standardCaseId}"
caseId      = projectCaseId
caseSortKey = "ChildCase#{status}#{updatedAt}#{standardCaseId}"
projectId   = projectCaseId
parentCaseId = projectCaseId
```

REQUEST child under STANDARD:

```text
pk          = "Case"
sk          = "Case#{requestCaseId}"
caseId      = standardCaseId
caseSortKey = "ChildCase#{status}#{updatedAt}#{requestCaseId}"
projectId   = projectCaseId
parentCaseId = standardCaseId
```

No new DynamoDB table or GSI should be added in Task 15.

## History Auto-Recording

Reuse `CaseHistoryAction.CHILD_CASE_CREATED`.

History should be written to the direct parent case:

```text
Child case created: {title}
```

When a STANDARD case is created under a PROJECT, the history is written to the PROJECT case.
When a REQUEST case is created under a STANDARD, the history is written to the STANDARD case.

History write failures should be logged and should not fail the main operation.

## UI Scope

### Dashboard

Update the existing Case creation modal so users can choose:

- `REQUEST`
- `STANDARD`
- `PROJECT`

Do not create a new landing page or a separate project creation route.

For `PROJECT`, use the same form shape as root `STANDARD`:

- title
- description
- delivery type
- target scope
- target user/team
- required role
- due date

Keep the UI consistent with the existing dashboard.

### Case Detail

Use the existing `/dashboard/cases/[id]` page.

For every case:

- Show direct child cases.
- Show loading, empty, and error states.

For `PROJECT` cases:

- Show child STANDARD cases.
- Show each STANDARD child's child REQUEST cases in a nested hierarchy view.
- Show a child STANDARD creation form when caller is creator or USER owner.
- After child creation, refresh child case list and history.

For `STANDARD` cases:

- Keep child REQUEST creation from Task 14.
- If the STANDARD belongs to a PROJECT, keep its `projectId` visible in case information.

For `REQUEST` cases:

- Do not show child creation form.

## IAM Fix Included in Task 15

The current claim approval handler uses DynamoDB `TransactWriteCommand`.
`UpdateCaseClaimRequestFunction` must have `dynamodb:TransactWriteItems` permission.

Add this permission only where it is needed.
Prefer a dedicated policy for `UpdateCaseClaimRequestFunction` with:

```text
Action: dynamodb:TransactWriteItems
Resource: tableArn
```

Do not broaden unrelated Lambda permissions.

## Out of Scope

Do not implement:

- Separate `Project` entity.
- Separate Project repository.
- Separate Project table or GSI.
- New top-level `/projects` route.
- External company participation.
- Participant company records.
- Project status aggregation from child cases.
- Completion approval flow.
- Task approval flow.
- Unlimited recursive hierarchy.
- New DynamoDB GSI.

## Deployment Impact

Expected infrastructure impact:

- No new Lambda is required if existing `POST /cases`, `GET /cases/{id}/children`, and `POST /cases/{id}/children` are reused.
- No new API route is required if existing routes are reused.
- No DynamoDB table or GSI change is required.
- IAM change is required for `UpdateCaseClaimRequestFunction`:
  - Add `dynamodb:TransactWriteItems` on the table ARN.

Because IAM changes affect deployed AWS permissions, mention this explicitly in the implementation report.

## Implementation Checks Before Editing

Before implementing Task 15, read:

- `AGENTS.md`
- `CLAUDE.md`
- `README.md`
- `docs/core/case-collaboration-model.md`
- `docs/workflow/v2-case-development-roadmap.md`
- `docs/workflow/task-14-standard-case-flow-plan.md`
- `docs/workflow/task-15-project-hierarchy-flow-plan.md`
- `repomix-output.xml`

Use `repomix-output.xml` only for analysis.
Do not edit it.

When target files are decided, reread the original source files before editing.

## Likely Files to Touch

Likely backend/core files:

- `packages/task-core/src/types/case.ts`
- `packages/task-core/src/case/CaseService.ts`
- `packages/task-api/src/aws/entities/items/caseRecord.ts`
- `packages/task-api/src/aws/entities/items/caseRecord.test.ts`
- `packages/task-api/src/aws/handlers/case/createCase.ts`
- `packages/task-api/src/aws/handlers/case/createCase.test.ts`
- `packages/task-api/src/aws/handlers/case/createChildCase.ts`
- `packages/task-api/src/aws/handlers/case/createChildCase.test.ts`
- `packages/task-api/src/aws/handlers/case/getChildCases.test.ts`

Likely frontend files:

- `packages/task-app/src/components/dashboard/CreateCaseModal.tsx`
- `packages/task-app/src/components/dashboard/CaseCard.tsx`
- `packages/task-app/src/app/dashboard/page.tsx`
- `packages/task-app/src/app/dashboard/cases/[id]/page.tsx`

Likely infra/docs files:

- `packages/task-infra/lib/task-infra-stack.ts`
- `README.md`

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

Manual check if possible:

- Dashboard can create a PROJECT case.
- PROJECT case opens in the existing Case detail page.
- PROJECT detail can create a STANDARD child case.
- PROJECT detail shows child STANDARD cases.
- STANDARD child detail can create a REQUEST child case.
- PROJECT detail shows `PROJECT -> STANDARD -> REQUEST` hierarchy.
- Claim approval IAM fix is reflected in the infra code.

## Claude Work Request

Use this instruction when asking Claude to implement Task 15:

```text
AGENTS.md、CLAUDE.md、README.md、docs/core/case-collaboration-model.md、docs/workflow/v2-case-development-roadmap.md、docs/workflow/task-14-standard-case-flow-plan.md、docs/workflow/task-15-project-hierarchy-flow-plan.md を必ず読んでください。

また、npx repomix で生成済みの repomix-output.xml も最初に確認してください。
ただし、repomix-output.xml は分析用です。直接編集してはいけません。
実際の修正は必ず原本ファイルに対して行ってください。
修正対象が決まったら、対象の原本ファイルを再度読んでから変更してください。

今回の作業は v2 Task 15 として扱います。

目的:
PROJECT case を作成し、PROJECT -> STANDARD -> REQUEST の階層を既存 Case 詳細画面で確認できるようにしてください。
Task 15 では Project を別 entity として作らず、既存 Case entity の `CaseType.PROJECT` root case として扱ってください。

作業範囲:

1. 既存の POST /cases で root PROJECT case を作成できるようにしてください。
   - caseType = PROJECT を許可してください。
   - projectId / parentCaseId は root 作成では引き続き受け付けないでください。
   - サーバー側で projectId = null、parentCaseId = null を設定してください。
   - companyId、creatorId、ownerId などをクライアントから信頼してはいけません。

2. 既存の POST /cases/{id}/children を拡張してください。
   - parent が PROJECT の場合は STANDARD child case を作成してください。
   - parent が STANDARD の場合は REQUEST child case を作成してください。
   - parent が REQUEST の場合は 400 を返してください。
   - PROJECT 配下の STANDARD child は projectId = parent PROJECT caseId、parentCaseId = parent PROJECT caseId にしてください。
   - STANDARD 配下の REQUEST child は parent の projectId を継承してください。
   - 新しい GSI は追加しないでください。既存 byCase を使ってください。

3. Dashboard の Case 作成 UI に PROJECT を追加してください。
   - REQUEST / STANDARD / PROJECT を選べるようにしてください。
   - 既存 dashboard の見た目と操作感に合わせてください。
   - loading、success、error、入力不備を画面内で扱ってください。

4. 既存の /dashboard/cases/[id] 詳細画面で PROJECT 階層を表示してください。
   - PROJECT detail では child STANDARD cases を表示してください。
   - 各 STANDARD child の child REQUEST cases も確認できる階層表示にしてください。
   - PROJECT creator または USER owner は STANDARD child を作成できるようにしてください。
   - STANDARD case では既存の REQUEST child 作成フローを維持してください。
   - REQUEST case では child 作成フォームを出さないでください。

5. 既存 Claim approval の IAM 不足を修正してください。
   - updateCaseClaimRequest handler は DynamoDB TransactWriteCommand を使っています。
   - UpdateCaseClaimRequestFunction に dynamodb:TransactWriteItems を追加してください。
   - 不要な Lambda 権限拡大はしないでください。

6. テストと README を更新してください。
   - PROJECT root 作成の API テストを追加してください。
   - PROJECT -> STANDARD child 作成の API テストを追加してください。
   - REQUEST に child case を作れないことをテストしてください。
   - README に Task 15 の成果をまとまった単位で追記してください。

まだ実装しないこと:

- 別 Project entity
- 別 Project repository
- 別 Project table / GSI
- /projects route
- 外部会社参加
- participant company record
- project status aggregation
- completion approval flow
- task approval flow
- 無制限再帰ツリー

禁止:

- 既存 task を v2 の最上位案件として拡張してはいけません。
- docs/core/case-collaboration-model.md の確定事項に反する実装をしてはいけません。
- 関係のないリファクタリングをしてはいけません。
- ソースコード、テスト名、コメント、README、設計文書に韓国語を書いてはいけません。
- any 型を使ってはいけません。
- eslint-disable で検査を回避してはいけません。
- repomix-output.xml を編集またはコミットしてはいけません。
- 新しい DynamoDB GSI を追加してはいけません。

検証してください:

- yarn.cmd type-check:core
- yarn.cmd type-check:api
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build
- yarn.cmd workspace @task/infra build
- yarn.cmd test:api

可能であれば yarn.cmd dev を起動し、画面で以下を確認してください。

- Dashboard から PROJECT case を作成できる。
- PROJECT case 詳細を開ける。
- PROJECT 詳細から STANDARD child case を作成できる。
- STANDARD child 詳細から REQUEST child case を作成できる。
- PROJECT 詳細で PROJECT -> STANDARD -> REQUEST 階層を確認できる。

作業後に報告してください:

- 変更したファイル
- 実装内容
- 実行した検証コマンドと結果
- 画面確認結果
- Task 15 でまだ行っていないこと
- ソースコード内に韓国語が残っていないことを確認した結果
- any 型と eslint-disable を使っていないことを確認した結果
- デプロイ影響
```
