# Current Architecture

このドキュメントは、AI が現在の TaskTree 構造を素早く理解するための基準文書です。

## 全体構造

TaskTree は Yarn Workspaces ベースの TypeScript モノレポです。

```text
packages/
  task-app
  task-core
  task-api
  task-infra
  task-ui
tests/
  e2e
docs/
  images
```

## 主な技術

- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Auth: AWS Cognito, AWS Amplify
- API: API Gateway, AWS Lambda
- Database: DynamoDB
- Infra: AWS CDK
- Test: Vitest, Playwright
- Monorepo: Yarn Workspaces

## ランタイムの流れ

ユーザー画面は `packages/task-app` で提供されます。

`task-app` は AWS SDK や Lambda 内部実装を直接呼び出してはなりません。認証と API 呼び出しは `@task/core` のサービス層を通じて行います。

`task-core` は Amplify ベースの認証、API 呼び出し、共通型を提供します。

`task-api` は API Gateway から呼び出される Lambda handler と DynamoDB repository を含みます。

`task-infra` は Cognito、API Gateway、Lambda、DynamoDB を AWS CDK で定義します。

`task-ui` は共通 UI コンポーネントと theme を提供します。

## 現在の機能領域

- ログイン
- 新規登録
- メール認証
- 招待ユーザーの初回ログイン
- 組織作成
- 事業部、部署、チーム管理
- ユーザー招待
- タスク作成、閲覧、更新、削除
- ロールベースのタスクアクセス制御

## 重要な設計特徴

- 認証ロジックは `@task/core` に集約されている。
- フロントエンドは `@task/core` のサービスと型を使用する。
- API handler は一部で依存性注入を利用し、テストしやすい構造を持つ。
- DynamoDB record 変換は `task-api/src/aws/entities/items` にある。
- インフラデプロイ後、`task-infra/scripts/write-app-env.mjs` が `task-app/.env.local` を更新する。

## 改善時の注意点

- `task-app` で AWS SDK を直接使用してはならない。
- `task-api` に UI 依存を追加してはならない。
- `task-core` にサーバー専用 AWS SDK 依存を追加してはならない。
- `task-infra` の変更は実際の AWS リソース変更につながるため、必ず先に影響範囲を説明する。
- 権限ロジックでは、フロントエンドの表示制御とバックエンドの検証を混同してはならない。
