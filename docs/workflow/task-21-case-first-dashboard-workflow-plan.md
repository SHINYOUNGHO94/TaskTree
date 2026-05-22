# Task 21: Case-first Dashboard Workflow Cleanup

## Purpose

Task 21 aligns the Dashboard and creation flows with `docs/core/case-collaboration-model.md`.

The current Dashboard still exposes the legacy v1 task flow next to the v2 Case flow. This causes unclear product behavior:

- Users see both `REQUEST 案件` and `新規タスク作成` as top-level actions.
- `CreateCaseModal` only supports `USER` and `TEAM` targets, so COMPANY_ADMIN / DIVISION_ADMIN / DEPT_ADMIN cannot create cases for the intended organization scope.
- Legacy tasks can be visible to lower roles, but they do not represent the v2 case-task execution flow clearly.
- The UI does not yet match the model's intended areas: `自分の案件`, `公開案件`, `組織案件`, `プロジェクト`.

Task 21 should make the Dashboard case-first and reduce v1 task confusion without deleting legacy task APIs.

## Source Of Truth

Implementation must follow:

- `docs/core/case-collaboration-model.md`
- `docs/core/operational-quality-baseline.md`
- `docs/core/package-boundaries.md`
- `docs/workflow/v2-case-development-roadmap.md`

## Scope

### 1. Dashboard top-level UX

Replace the current mixed action layout with a Case-first layout.

Required:

- Primary action should be `案件作成`.
- `案件作成` opens one modal that supports `REQUEST`, `STANDARD`, and `PROJECT`.
- Do not show `REQUEST 案件` as a separate top-level button.
- Do not show legacy `新規タスク作成` as a primary action.
- Legacy task list may remain, but it must be visually separated as legacy / old task area, or hidden behind a compact section.
- Add short Japanese UI labels that distinguish:
  - `案件`: business/request/collaboration unit.
  - `タスク`: work item under a Case.

Do not remove legacy task APIs in this task.

### 2. Case creation target flow

`CreateCaseModal` must support the model's `targetScope` and `requiredRole`.

Required target scope behavior:

- COMPANY_ADMIN:
  - Can target `COMPANY`, `DIVISION`, `DEPARTMENT`, `TEAM`, `USER`.
  - Must choose a valid target ID for all scopes except `COMPANY`.
- DIVISION_ADMIN:
  - Can target own `DIVISION`, departments under own division, teams under own division, users under own division.
  - Cannot target another division or whole company.
- DEPT_ADMIN:
  - Can target own `DEPARTMENT`, teams under own department, users under own department.
  - Cannot target division/company or another department.
- TEAM_ADMIN:
  - Can target own `TEAM` or users in own team.
  - Cannot target department/division/company.
- USER:
  - Can target self.

Required role behavior:

- `requiredRole` must be selectable where it makes sense.
- The selected `requiredRole` must not exceed the creator's role.
- A target user case should normally use `requiredRole = USER`.
- The UI must not let a lower role create a case visible only to a higher role in a higher scope.

Required delivery behavior:

- Support `DIRECT` and `OPEN` in the modal.
- `DIRECT` means a specific target scope / target ID is selected.
- `OPEN` means visible to eligible users under the selected target scope and `requiredRole`.
- If a specific user is selected, `DIRECT` is the default.

### 3. Organization target selectors

The modal must load organization data through existing services:

- `OrgService.getDivisions`
- `OrgService.getDepartments`
- `OrgService.getTeams`
- `UserService.getCompanyUsers`

Selector rules:

- Options must be filtered by caller role and own organization scope.
- Selecting a division filters department options.
- Selecting a department filters team options.
- Selecting a team filters user options.
- Selecting a user sets `targetScope = USER` and `targetScopeId = userId`.
- Empty / loading / error states must be shown inline.

### 4. Case sections on Dashboard

The Dashboard should move toward the model's four areas:

- `自分の案件`
- `公開案件`
- `組織案件`
- `プロジェクト`

Task 21 does not need to create new backend APIs if existing `GET /cases` data can support the first UI cleanup.

Minimum acceptable implementation:

- Add a segmented control or tabs for the four areas.
- Reuse existing loaded cases and client-side filters where possible.
- `自分の案件`: created by me or owned by me.
- `公開案件`: `deliveryType = OPEN`.
- `組織案件`: cases not limited to a personal user target, visible to the current user.
- `プロジェクト`: `caseType = PROJECT`.
- Keep existing search / filter / sort within the active area.
- Empty states must explain the selected area in Japanese.

If the current API data is insufficient for a perfect organization-case view, implement the best client-side version and document the remaining backend gap in the completion report.

### 5. Legacy task handling

Legacy v1 tasks must not be presented as the main v2 workflow.

Required:

- Rename the section from `マイタスク` to a clearly legacy or personal task label, for example `旧タスク` or `個人タスク`.
- Move it below the Case sections or collapse it.
- Remove the primary `新規タスク作成` button from the top header.
- If legacy task creation remains, place it inside the legacy task section only.
- Do not imply that legacy tasks are the same as Case tasks.

### 6. README and roadmap

Update documentation:

- `README.md`: add Task 21 summary in Japanese.
- `docs/workflow/v2-case-development-roadmap.md`: add Task 21 as post-Task 18 cleanup / quality correction.

README should be concise and outcome-level, not a fine-grained work log.

## Out Of Scope

Do not implement in Task 21 unless it is already trivial and necessary for the UI to work:

- Deleting legacy task API / DynamoDB records.
- Full backend rewrite for `自分の案件`, `公開案件`, `組織案件`, `プロジェクト`.
- New GSI.
- Full approval workflow rewrite.
- Case task edit/delete/approval flow.
- Data migration.

## Review Points

The final report must explicitly cover:

- Authorization and tenant separation.
- API contract / validation changes.
- DynamoDB access pattern and GSI impact.
- IAM and deployment impact.
- UI loading / empty / error states.
- Remaining gaps against `case-collaboration-model.md`.
- Verification commands run or intentionally skipped.

## Suggested Verification

The user may run verification manually. Suggested commands:

```powershell
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
```

If API logic changes, also run:

```powershell
yarn.cmd test:api
```
