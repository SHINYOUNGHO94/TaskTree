# Task 24: CaseTask 操作フロー整備

## 目的

Case 詳細の `作業一覧` を、単なる表示リストから実際に運用できる作業管理 UI にする。

Task 11 で CaseTask の作成と一覧表示は実装済みだが、現在は作成後にクリックしても反応せず、状態変更・編集・削除・担当者変更ができない。

Task 24 では、Case 配下の実作業タスクを Case 詳細内で操作できるようにする。

## 背景

v2 では standalone task flow を Task 22 で削除し、作業管理は Case 配下の CaseTask に集約する方針になった。

そのため、CaseTask は以下の用途を満たす必要がある。

- 担当者が作業を分解する
- owner / creator が作業を整理する
- 作業の状態を更新する
- 不要な作業を削除する
- 担当者を変更する

## Source Of Truth

作業前に以下を読む。

- `AGENTS.md`
- `GPT.md`
- `README.md`
- `docs/core/case-collaboration-model.md`
- `docs/core/package-boundaries.md`
- `docs/core/operational-quality-baseline.md`
- `docs/workflow/v2-case-development-roadmap.md`
- `docs/workflow/task-11-case-task-flow-plan.md`
- `docs/workflow/task-22-remove-legacy-task-flow-plan.md`
- `docs/workflow/task-23-case-display-name-labels-plan.md`

## In Scope

### 1. CaseTask 詳細 / 操作 UI

Case 詳細画面の `作業一覧` で、各 CaseTask をクリックまたは操作ボタンから編集できるようにする。

最低限必要な UI:

- title 表示
- description 表示
- status 表示 / 変更
- assignee 表示 / 変更
- dueDate 表示 / 変更
- 編集 modal または inline panel
- 削除 confirm modal
- loading state
- error state

### 2. CaseTask 更新 API

既存の `GET /cases/{id}/tasks`、`POST /cases/{id}/tasks` に加えて、更新 API を追加する。

推奨 route:

- `PUT /cases/{id}/tasks/{taskId}`

更新可能項目:

- `title`
- `description`
- `status`
- `assigneeId`
- `dueDate`

部分更新を許可する。

Client から変更不可:

- `caseId`
- `taskId`
- `companyId`
- `creatorId`
- `createdAt`
- `updatedAt`

### 3. CaseTask 削除 API

削除 API を追加する。

推奨 route:

- `DELETE /cases/{id}/tasks/{taskId}`

削除は物理削除でよい。

削除時は、CaseTask が対象 Case に属していることを必ず確認する。

### 4. 担当者変更

CaseTask の `assigneeId` を変更できるようにする。

担当者候補:

- 同一 company の user
- 可能なら Case の targetScope に含まれる user に絞る
- 最低限、他社 user を担当にできないこと

表示名は Task 23 の `resolveDisplayName` / `caseLabels.ts` を使う。

### 5. 認可

更新 / 削除できる user:

- Case creator
- Case owner が USER で本人
- Case owner が TEAM / DEPARTMENT / DIVISION / COMPANY の場合、その組織を管理できる role
- CaseTask creator
- CaseTask assignee

読み取り権限だけの user は更新 / 削除できない。

最低限、以下は禁止:

- 他社 CaseTask の更新 / 削除
- 対象 Case に属さない taskId の更新 / 削除
- 権限のない user による更新 / 削除
- client 指定 companyId / creatorId の信頼

### 6. History 記録

CaseTask の操作時に CaseHistory を記録する。

必要な action:

- `TASK_UPDATED`
- `TASK_STATUS_CHANGED`
- `TASK_ASSIGNEE_CHANGED`
- `TASK_DELETED`

既存 enum にない場合は追加する。

detail には最低限分かる日本語または英語メッセージを残す。

例:

- `Task updated: {title}`
- `Task status changed from TODO to DONE: {title}`
- `Task assignee changed: {title}`
- `Task deleted: {title}`

History 記録失敗時は本処理を失敗させず、既存方針と同じく log のみにする。

### 7. Frontend Service / Type

`@task/core` に必要な型と service method を追加する。

推奨:

- `UpdateCaseTaskInput`
- `CaseService.updateCaseTask(caseId, taskId, input)`
- `CaseService.deleteCaseTask(caseId, taskId)`

### 8. Infra

CDK stack に Lambda と route を追加する。

想定:

- `UpdateCaseTaskFunction`
- `DeleteCaseTaskFunction`
- `PUT /cases/{id}/tasks/{taskId}`
- `DELETE /cases/{id}/tasks/{taskId}`

IAM は最小権限にする。

必要候補:

- `dynamodb:GetItem`
- `dynamodb:Query`
- `dynamodb:PutItem` または `dynamodb:UpdateItem`
- `dynamodb:DeleteItem`

### 9. README 更新

`README.md` に Task 24 の成果を日本語で簡潔に追加する。

細かい作業ログではなく、成果単位で書く。

## Out Of Scope

Task 24 では以下を実装しない。

- ChildCase 作成 UX 改善
- OPEN case 専用探索画面
- notification / email
- approval workflow の拡張
- comment edit / delete
- attachment
- time tracking
- DynamoDB GSI 追加

## Review Points

- CaseTask はクリックまたは操作ボタンで編集できる。
- status / assignee / dueDate / title / description を更新できる。
- CaseTask を削除できる。
- 他社 CaseTask を操作できない。
- 対象 Case と taskId の紐付けを server side で検証している。
- 認可は server side で完結している。
- UI は loading / error / disabled state を持つ。
- History が記録される。
- Task 22 で削除した legacy standalone task flow を復活させていない。
- Task 23 の表示名 / label helper を使っている。

## Deployment Impact

想定される影響:

- CDK deploy 必要
- 新規 Lambda:
  - `UpdateCaseTaskFunction`
  - `DeleteCaseTaskFunction`
- 新規 API route:
  - `PUT /cases/{id}/tasks/{taskId}`
  - `DELETE /cases/{id}/tasks/{taskId}`
- DynamoDB table / GSI 変更なし
- IAM 追加あり

## Suggested Verification

```bash
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
yarn.cmd test:api
```

## Manual Check Scenario

AWS deploy 後に確認する。

1. 部長またはチームリーダーで Case を開く
2. `作業一覧` に CaseTask を作成する
3. 作成した CaseTask を開く
4. title / description / dueDate を変更する
5. status を変更する
6. assignee を変更する
7. 履歴に変更が記録されることを確認する
8. CaseTask を削除する
9. 権限のない user で更新 / 削除できないことを確認する

## Completion Report Requirements

完了報告には以下を含める。

- 追加 / 変更した API
- 追加 / 変更した Lambda / IAM
- 追加 / 変更した core type / service
- UI の操作内容
- 認可ルール
- History 記録内容
- deployment impact
- 残課題
- 検証結果
