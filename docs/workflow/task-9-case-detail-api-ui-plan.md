# Task 9 Case Detail API and UI Plan

This document is a handoff note for continuing TaskTree v2 Case development after Task 8.

TaskTree v2 Case work must follow `docs/core/case-collaboration-model.md`.

## Current Completed State

Task 8 added the minimum flow for viewing created cases from the dashboard.

- `GET /cases` API and `GetCasesFunction` Lambda were added.
- `CaseService.getCases` was added to `@task/core`.
- The dashboard now displays a Case list using `CaseCard`.
- `REQUEST` case creation refreshes the Case list after success.
- Case list loading, empty, and error states are handled in the UI.
- Case records now include `assigneeKey`, `assigneeSortKey`, `visibilityKey`, and `visibilitySortKey` for `byAssignee` and `byVisibility` query patterns.

Task 8 did not add Case detail, edit, delete, status updates, History, Comment, Claim request, Project, or child case features.

## Next Work

The next work unit is Task 9.

Recommended branch name:

```text
codex/task-9-case-detail-api-ui
```

Task 9 adds a single-case read flow so users can open a Case from the dashboard and inspect its details.

## Task 9 Goal

Task 9 adds `getCase` API and a Case detail screen.

Users can already create a `REQUEST` case and see it in the dashboard list. They now need a way to open one case and confirm its full information.

Task 9 should connect API, core service, route, and UI as one verifiable user flow.

## Task 9 Recommended Scope

Implement the following:

- Add `getCase` handler in `task-api`.
- Add `GET /cases/{id}` API route and Lambda in `task-infra`.
- Add `CaseService.getCase(caseId)` in `@task/core`.
- Add `/dashboard/cases/[id]` detail page in `task-app`.
- Make `CaseCard` clickable and navigate to the detail route.
- Show loading, not found, access denied, and generic error states in the detail UI.
- Display current Case detail fields without adding edit or mutation actions.
- Keep `task-app` dependent only on `@task/core` service and shared types.

## Minimum Case Detail Fields

The detail screen should show the current data contract clearly.

Recommended fields:

- title
- description
- caseType
- status
- deliveryType
- ownerType
- ownerId
- targetScope
- targetScopeId
- requiredRole
- dueDate
- createdAt
- updatedAt

If useful, also show:

- projectId
- parentCaseId
- creatorId

Do not add fake child case, task, comment, or history data.

## API Access Policy

`GET /cases/{id}` must not return a case just because the caller knows the ID.

The handler should:

- Require Cognito authentication.
- Read `caseId` from the path parameter.
- Load caller profile from server-side user repository.
- Load the case by ID using `CaseRepository.findById`.
- Return `404` if the case does not exist.
- Return `403` if the caller is not allowed to view the case.
- Return `200` with the case detail only when access is allowed.

Initial access rules should match Task 8's current search scope:

- Caller is the case creator.
- Caller is the case owner when `ownerType = USER`.
- Case targets the caller directly with `targetScope = USER`.
- Case targets the caller's team with `targetScope = TEAM`.

Do not broaden access to company, division, department, external company, OPEN claim, or participant-company logic in Task 9 unless the access rule is explicitly documented first.

## Repository and GSI Policy

Task 9 should not require a new GSI.

Use the existing primary key access pattern:

```text
pk = Case
sk = Case#{caseId}
```

`byCase` is reserved for future detail-related child records such as child cases, tasks, comments, history, and claim requests. Task 9 should not create those records.

## UI Policy

The Case detail page should be useful but limited.

- Follow the existing dashboard and task detail visual style.
- Use a back action to return to `/dashboard`.
- Keep Case and Task concepts visually distinct.
- Do not show edit/delete/status-change buttons yet.
- Do not show History or Comment tabs as working features yet.
- Empty optional fields should be displayed as empty or "none" style text, not hidden in a confusing way.
- Mobile and desktop layouts must not overlap text.

## Out of Scope

Do not implement the following in Task 9:

- Case edit
- Case delete
- Case status change
- Case child records query
- Case task creation
- History record
- Comment
- Claim request
- Approval flow
- STANDARD case creation
- PROJECT case creation
- OPEN case public list
- External company participant UI
- Assignment record formalization
- Visibility record formalization
- New DynamoDB GSI

## Deployment Impact

Task 9 changes API Gateway, Lambda, and IAM if `GET /cases/{id}` is added.

Expected infrastructure impact:

- New Lambda function: `GetCaseFunction`
- New API route: `GET /cases/{id}`
- IAM read permissions for the new Lambda: DynamoDB `GetItem` and likely `Query` if user profile lookup requires it

No new DynamoDB table or GSI should be required.

Before deployment, confirm whether the existing stack already has the Task 8 case GSIs deployed. If the stack is an existing DynamoDB table, GSI operations must still follow the documented deployment order.

## Implementation Checks Before Editing

Before implementing Task 9, read:

- `AGENTS.md`
- `GPT.md` or `CLAUDE.md`
- `README.md`
- `docs/core/case-collaboration-model.md`
- `docs/workflow/v2-case-development-roadmap.md`
- `docs/workflow/task-8-case-list-api-ui-plan.md`
- `docs/workflow/task-9-case-detail-api-ui-plan.md`
- `repomix-output.xml`

Use `repomix-output.xml` only for analysis. Do not edit it.

When target files are decided, reread the original source files before editing.

## Likely Files to Touch

Likely backend/core files:

- `packages/task-api/src/aws/handlers/case/getCase.ts`
- `packages/task-api/src/aws/handlers/case/getCase.test.ts`
- `packages/task-api/src/repositories/caseRepository.ts`
- `packages/task-core/src/case/CaseService.ts`
- `packages/task-infra/lib/task-infra-stack.ts`

Likely frontend files:

- `packages/task-app/src/components/dashboard/CaseCard.tsx`
- `packages/task-app/src/app/dashboard/page.tsx`
- `packages/task-app/src/app/dashboard/cases/[id]/page.tsx`

## Verification Candidates

Run the narrow checks first, then broader checks if implementation touches more files.

```text
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd test:api
```

If possible, start the app and verify manually:

```text
yarn.cmd dev
```

Manual checks:

- Dashboard Case card opens the detail page.
- Detail page shows loading state.
- Detail page shows the selected Case fields.
- Missing or unauthorized case shows a clear screen state.
- Back action returns to dashboard.
- Mobile width does not break the layout.

## Claude Work Request

If asking Claude to implement Task 9, use this instruction:

```text
AGENTS.md、CLAUDE.md、README.md、docs/core/case-collaboration-model.md、docs/workflow/v2-case-development-roadmap.md、docs/workflow/task-8-case-list-api-ui-plan.md、docs/workflow/task-9-case-detail-api-ui-plan.md を必ず読んでください。

また、npx repomix で生成済みの repomix-output.xml も最初に確認してください。
ただし、repomix-output.xml は分析用です。直接編集してはいけません。
実際の修正は必ず原本ファイルに対して行ってください。
修正対象が決まったら、対象の原本ファイルを再度読んでから変更してください。

今回の作業は v2 Task 9 として扱います。

目的:
Dashboard の Case 一覧から Case 詳細画面を開けるようにするため、getCase API と Case 詳細 UI を追加してください。

作業範囲:

1. getCase handler を追加してください。
2. GET /cases/{id} API route と Lambda を追加してください。
3. @task/core に CaseService.getCase(caseId) を追加してください。
4. /dashboard/cases/[id] 詳細画面を追加してください。
5. CaseCard から詳細画面へ遷移できるようにしてください。
6. loading、not found、access denied、error state を画面内に表示してください。
7. task-app から Lambda や DynamoDB を直接触ってはいけません。
8. UI は既存 dashboard と task detail の見た目に合わせてください。

アクセス制御:

- 認証済みユーザーだけが GET /cases/{id} を呼べるようにしてください。
- クライアントから渡された userId や companyId を信頼してはいけません。
- user profile と case record をサーバー側で取得して閲覧可否を判断してください。
- Task 9 の最小許可範囲は、作成者、USER owner、USER target、TEAM target です。
- 権限外の case は 403 を返してください。
- 存在しない case は 404 を返してください。

まだ実装しないこと:

- Case 編集
- Case 削除
- Case 状態変更
- History
- Comment
- Claim request
- Approval flow
- STANDARD / PROJECT 作成 UI
- OPEN case
- 外部会社参加 UI
- 新規 GSI

禁止:

- 既存 task を v2 の最上位案件として拡張してはいけません。
- docs/core/case-collaboration-model.md の確定事項に反する実装をしてはいけません。
- 関係のないリファクタリングをしてはいけません。
- ソースコード、テスト名、コメント、README、設計文書に韓国語を書いてはいけません。
- any 型を使ってはいけません。
- eslint-disable で検査を回避してはいけません。
- repomix-output.xml を編集またはコミットしてはいけません。
- DynamoDB の広範囲 Scan に依存してはいけません。

検証してください:

- yarn.cmd type-check:core
- yarn.cmd type-check:api
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build
- yarn.cmd test:api

可能であれば yarn.cmd dev を起動し、Dashboard から Case 詳細画面へ遷移できることを確認してください。

作業後に報告してください:

- 変更したファイル
- 実装内容
- 実行した検証コマンドと結果
- 画面確認結果
- Task 9 でまだ行っていないこと
- ソースコード内に韓国語が残っていないことを確認した結果
- any 型と eslint-disable を使っていないことを確認した結果
- デプロイ影響
```

## Handoff Note

Task 9 should make Case list items inspectable.

Keep the scope to read-only detail. Mutation, History, Comment, and child records belong to later roadmap tasks.
