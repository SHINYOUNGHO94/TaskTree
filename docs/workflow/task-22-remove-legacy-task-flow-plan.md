# Task 22: Remove Legacy Task Flow

## Goal

Remove the legacy top-level v1 task flow from the current v2 application.

The product direction is now case-first. A "task" should mean work inside a Case (`/cases/{id}/tasks`), not the old standalone task feature.

## Background

The dashboard still contains a collapsed legacy section:

- `個人タスク（旧）`
- legacy task creation UI
- legacy top-level task detail route

This creates confusion because v2 already has Case, CaseTask, Claim, Comment, History, and ChildCase flows.

Task 22 removes this old flow from the active codebase.

## Source Of Truth

Read these before implementation:

- `AGENTS.md`
- `GPT.md`
- `README.md`
- `docs/core/case-collaboration-model.md`
- `docs/core/package-boundaries.md`
- `docs/core/operational-quality-baseline.md`
- `docs/workflow/v2-case-development-roadmap.md`
- `docs/workflow/task-21-case-first-dashboard-workflow-plan_jp.md`
- `docs/workflow/task-21-case-first-dashboard-workflow-plan_kr.md`

## In Scope

### 1. Dashboard Cleanup

- Remove the legacy `個人タスク（旧）` section from `packages/task-app/src/app/dashboard/page.tsx`.
- Remove legacy task state, effects, handlers, imports, and modal wiring from the dashboard.
- The dashboard should remain case-first:
  - case tabs
  - case creation
  - external invitation area if still used
  - no standalone task creation entry point

### 2. Legacy Task UI Removal

Remove or stop using legacy top-level task UI files if they become unused:

- `packages/task-app/src/components/dashboard/CreateTaskModal.tsx`
- `packages/task-app/src/components/dashboard/TaskCard.tsx`
- `packages/task-app/src/components/dashboard/EmptyTaskState.tsx`
- `packages/task-app/src/app/dashboard/tasks/[id]/page.tsx`

If a file is removed, also remove all imports and routes depending on it.

### 3. Legacy Task Core Cleanup

Remove or stop exporting the legacy standalone task service/types if no longer referenced:

- `packages/task-core/src/task/TaskService.ts`
- `packages/task-core/src/types/task.ts`
- related exports in `packages/task-core/src/index.ts`

Search for references before deleting:

- `TaskService`
- `TaskStatus`
- `TaskLevel`
- `AccessScope`
- `CreateTaskInput`
- `UpdateTaskInput`

### 4. Legacy Task API And Infra Cleanup

Remove the top-level `/tasks` API flow:

- `GET /tasks`
- `POST /tasks`
- `GET /tasks/{id}`
- `PUT /tasks/{id}`
- `DELETE /tasks/{id}`

Likely affected areas:

- `packages/task-api/src/aws/handlers/task/*`
- legacy task repository/entity files, if they exist and are no longer referenced
- `packages/task-infra/lib/task-infra-stack.ts`

Remove related Lambda definitions and API Gateway routes:

- `GetTasksFunction`
- `CreateTaskFunction`
- `GetTaskFunction`
- `UpdateTaskFunction`
- `DeleteTaskFunction`

Keep shared helpers only if still used by non-task flows.

### 5. Documentation

Update `README.md` in Japanese with a concise Task 22 summary:

- legacy standalone task flow removed
- dashboard is now case-first
- top-level `/tasks` API removed
- v2 CaseTask flow remains
- deployment impact

Update `docs/workflow/v2-case-development-roadmap.md` if needed so Task 22 is recorded as the legacy cleanup step.

## Explicitly Out Of Scope

Do not implement these in Task 22:

- CaseTask edit/delete/status/assignee workflow
- display name resolution for Cognito user ids
- Japanese labels for `REQUEST`, `STANDARD`, `PROJECT`, `DIRECT`, `OPEN`
- ChildCase creation UX improvements
- DynamoDB data migration

These are planned for later tasks.

## Do Not Remove

Do not remove v2 CaseTask features:

- `CaseTaskStatus`
- `CaseTaskSummary`
- `CaseTaskDetail`
- `CreateCaseTaskInput`
- `CaseService.getCaseTasks`
- `CaseService.createCaseTask`
- `packages/task-api/src/aws/handlers/case/getCaseTasks.ts`
- `packages/task-api/src/aws/handlers/case/createCaseTask.ts`
- `/cases/{id}/tasks`
- Case detail page task list and task creation section

Task 22 removes only legacy top-level standalone tasks.

## Review Points

- Dashboard has no `個人タスク（旧）` or standalone task creation UI.
- No active frontend route points to `/dashboard/tasks/{id}`.
- No active API route remains for top-level `/tasks`.
- No deleted type/service is still exported or imported.
- v2 CaseTask APIs and UI still remain intact.
- CDK stack no longer defines legacy task Lambdas/routes.
- README describes deployment impact clearly.

## Deployment Impact

This task removes API Gateway routes and Lambda functions from the CDK stack.

Expected impact:

- CDK deploy required.
- Removed routes:
  - `/tasks`
  - `/tasks/{id}`
- Removed Lambda functions:
  - legacy standalone task handlers
- DynamoDB table schema/GSI should not change.
- Existing legacy task data may remain in DynamoDB unless the environment is recreated.

The user plans to recreate AWS resources after this task, so legacy data migration is not required.

## Suggested Verification

Run after implementation:

```bash
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
yarn.cmd test:api
```

## Completion Report Requirements

Report:

- removed files
- modified files
- confirmed retained CaseTask files/routes
- removed API routes/Lambdas
- deployment impact
- verification results
- remaining known gaps for the next task
