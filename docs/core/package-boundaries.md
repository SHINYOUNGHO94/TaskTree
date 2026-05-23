# Package Boundaries

このドキュメントは、TaskTree のパッケージ責務と変更禁止ラインを定義します。

## パッケージ責務

### `packages/task-app`

Next.js ベースのフロントエンドアプリケーションです。

担当範囲:

- App Router ページ
- ログイン、登録、認証、ダッシュボード、チーム管理など TaskTree ドメインに依存する画面とコンポーネント
- React component の組み合わせ
- ユーザー入力と画面状態
- `@task/core` サービス呼び出し
- `@task/ui` 共通コンポーネントの利用

禁止:

- AWS SDK を直接使用してはならない。
- Lambda handler を直接 import してはならない。
- DynamoDB record 構造を直接操作してはならない。
- インフラリソース名や権限ポリシーを直接管理してはならない。

### `packages/task-core`

フロントエンドとドメイン機能の間にある共有層です。

担当範囲:

- 共通型
- 認証サービス
- API 呼び出しサービス
- ユーザー、組織、タスク関連のクライアントサービス
- フロントエンドと API のデータ契約

禁止:

- React component を作成してはならない。
- Next.js routing に依存してはならない。
- サーバー専用 Lambda handler に依存してはならない。
- CDK リソースを作成してはならない。

### `packages/task-api`

AWS Lambda ベースの API 実装です。

担当範囲:

- API Gateway イベント処理
- Lambda handler
- Repository
- DynamoDB read/write
- DynamoDB record 変換
- サーバー側の権限検証
- API エラー応答

禁止:

- React、Next.js、UI 依存を追加してはならない。
- ブラウザ専用 API を使用してはならない。
- フロントエンドの画面状態を処理してはならない。
- CDK リソースを定義してはならない。

### `packages/task-infra`

AWS CDK ベースのインフラ定義です。

担当範囲:

- Cognito
- API Gateway
- Lambda
- DynamoDB
- IAM 権限
- CDK output
- デプロイ後の app env 更新スクリプト

禁止:

- UI を実装してはならない。
- Lambda handler 内部のビジネスロジックを実装してはならない。
- フロントエンドの画面フローを実装してはならない。
- 明確な説明なしに権限を拡大してはならない。

### `packages/task-ui`

共通 UI コンポーネントと theme のパッケージです。

担当範囲:

- 再利用可能な UI コンポーネント
- theme CSS
- presentation 中心のコンポーネント

禁止:

- 認証ロジックを持ってはならない。
- API 呼び出しを行ってはならない。
- Next.js page/router に依存してはならない。
- ビジネスロジックを集中させてはならない。

## 依存方向

基本の依存方向は以下に従います。

```text
task-app -> task-core
task-app -> task-ui
task-api -> task-core
task-infra -> task-core
```

注意:

- `task-core` は可能な限り独立した共有層として維持する。
- `task-ui` はドメインと API を知ってはならない。
- `task-api` と `task-infra` は責務を混ぜてはならない。

## 変更判断基準

新機能を追加する場合は、以下の基準で配置場所を判断します。

- 画面とユーザー操作なら `task-app`
- 複数画面で共有する型や API 呼び出しなら `task-core`
- サーバー側のデータ検証、権限検証、DB アクセスなら `task-api`
- AWS リソース作成や権限設定なら `task-infra`
- ドメインを持たない再利用 UI なら `task-ui`
