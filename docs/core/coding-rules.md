# Coding Rules

このドキュメントは、TaskTree のコード修正時に必ず従うべきルールです。

## 基本原則

- TypeScript の型安全性を優先する。
- 既存のコードスタイルを優先する。
- 不要なリファクタリングをしてはならない。
- 関係のないファイルを変更してはならない。
- ユーザーが作成した変更を戻してはならない。
- シークレット、トークン、個人情報、デプロイ成果物をコミットしてはならない。

## TypeScript

- 可能な場合は明示的な型を使用する。
- `any` は避ける。やむを得ず使う場合は理由が明確でなければならない。
- 共通型は `@task/core` に置くことを優先的に検討する。
- ランタイムデータは、必要に応じて `zod` などで検証する。
- API レスポンス形式を変更する場合は、フロントエンドと API の両方への影響を必ず確認する。

## React / Next.js

- 画面実装は `packages/task-app` で行う。
- App Router 構造を維持する。
- Client Component は必要な場合にのみ使用する。
- フォームは既存パターンである `react-hook-form` と `zod` の使用を優先する。
- アイコンは既存の `lucide-react` 使用を優先する。
- 画面が API の内部実装を直接知る構造にしてはならない。

## API / Lambda

- Lambda handler は、入力検証、権限検証、repository 呼び出し、応答生成を明確に分離する。
- サーバー側の権限検証を、フロントエンドの表示制御で代替してはならない。
- エラー応答は、ユーザー理解とデバッグの両方に役立つ形で一貫させる。
- DynamoDB アクセスは repository 経由で行う。
- テストしやすい構造を維持する。

## Infrastructure

- `packages/task-infra` の変更は、実際の AWS リソースに影響する可能性がある。
- IAM 権限は最小権限の原則に従う。
- 権限拡大が必要な場合は、必ず理由を説明する。
- Cognito、API Gateway、Lambda、DynamoDB の変更では、必ずデプロイ影響を説明する。
- `deploy` や CDK 関連作業の前に、必ず変更範囲を確認する。

## UI

- 実際のアプリとして使える流れを優先する。
- ポートフォリオ用の派手さよりも、使いやすさと明確さを優先する。
- ボタン、入力、エラーメッセージ、ローディング状態、空状態を省略してはならない。
- テキストがモバイルとデスクトップで崩れたり重なったりしてはならない。
- 既存 theme とコンポーネントスタイルを優先する。

## 検証コマンド

可能な場合は、変更範囲に応じて以下のコマンドを実行します。

```text
yarn type-check
yarn lint
yarn test:api
yarn test:e2e
yarn build
```

パッケージ別の確認で十分な場合は、より狭いコマンドを使用します。

```text
yarn type-check:ui
yarn type-check:core
yarn type-check:api
yarn workspace @task/app lint
yarn workspace @task/api test
```

検証を実行できなかった場合は、最終報告で必ず理由を書く。
