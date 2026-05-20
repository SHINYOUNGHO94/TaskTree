# Task 6 Case API Plan

このドキュメントは、Task 5 完了後に次のチャットまたは別環境で作業を再開するための引き継ぎメモです。

TaskTree v2 の新機能は、`docs/core/case-collaboration-model.md` を基準に進めます。
`docs/core/case-collaboration-model_kr.md` は韓国語の企画参考文書であり、実装基準ではありません。

## 現在の完了状態

Task 5 では、v2 Case 実装の基盤を追加しました。

- `AGENTS.md` に Repomix 使用規則と v2 Case 開発基準を追加した。
- `@task/core` に Case 関連の型を追加した。
- DynamoDB に Case 用 GSI として `byCase`、`byAssignee`、`byVisibility` を追加した。
- `task-api` に `CaseRecord` と `CaseRepository` を追加した。
- `task-api` に `createCase` handler とテストを追加した。
- `createCase` では、作成者情報をサーバー側で決定し、`targetScope` と `requiredRole` の権限検証を行う。

## 重要な注意点

- 既存の `task` を v2 の最上位案件として拡張してはならない。
- 新規設計は `case` 中心で進める。
- 既存の組織構造 `company -> division -> department -> team -> user` は維持する。
- 既存 GSI `company`、`division`、`department`、`team`、`user` は変更しない。
- Case 用 GSI は新規追加のみとする。
- 既存 DynamoDB テーブルに GSI を追加する場合、実際のデプロイでは 1 回に 1 つずつ追加する。
- GSI が `ACTIVE` になる前に、その GSI を使う API を本番運用してはならない。
- `packages/task-infra/tsconfig.json` の `module` / `moduleResolution` 変更は、ユーザー指示による意図した変更である。勝手に戻してはならない。

## 次に行う作業

次の大きな作業単位は、Task 6 として扱う。

推奨ブランチ名:

```text
codex/task-6-case-api-routing
```

Task 6 の目的は、Task 5 で作成した `createCase` handler を実際の API 経路とフロントエンド共有層に接続し、画面実装前の API 呼び出し基盤を作ることです。

## Task 6 推奨範囲

Task 6 では、次の内容を検討します。

- `task-infra` に `POST /cases` ルートを追加する。
- `CreateCaseFunction` Lambda を追加する。
- `CreateCaseFunction` に必要な DynamoDB read/write 権限を付与する。
- `@task/core` に `CaseService` を追加する。
- `CaseService.createCase(input: CreateCaseInput)` を追加する。
- `task-app` から直接 Lambda や DynamoDB を触らず、必ず `@task/core` 経由で呼び出す形にする。
- API route 追加後、最低限の手動またはテスト用確認手順を整理する。

## Task 6 でまだ行わないこと

Task 6 では、次の内容は原則としてまだ実装しません。

- Case 作成 UI
- Case 一覧 UI
- Case 詳細 UI
- `getCase`
- `getCases`
- Assignment record
- Visibility record
- History record
- Claim request
- Comment
- Project
- Child case
- Case 配下の task 作成

これらは、Task 6 の後に小さな作業単位へ分けて進めます。

## 実装前に確認すること

Task 6 を始める前に、必ず次を確認します。

- `repomix-output.xml` が最新か。
- `AGENTS.md`、`GPT.md`、`README.md`、`docs/core/case-collaboration-model.md` を読んだか。
- `docs/workflow/task-6-case-api-plan.md` を読んだか。
- `createCase` handler が最新の Repomix に含まれているか。
- GSI 追加の実デプロイ順序を PR 説明に明記するか。
- `task-infra` 変更のデプロイ影響を説明する準備があるか。

## 検証候補

Task 6 の検証候補は次の通りです。

```text
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/infra build
```

API route 追加後に可能であれば、`createCase` handler の既存テストも再実行します。

```text
yarn.cmd test:api src/aws/handlers/case/createCase.test.ts
```

## 引き継ぎメモ

Task 5 は、v2 Case 機能の土台を作る作業です。
Task 6 は、Case API を実際に呼び出せる形へ接続する作業です。

画面実装はまだ早いです。
まず API 経路と `@task/core` のサービス層を整えます。
