# TaskTree(ポートフォリオプロジェクト)

# プロジェクトの目的

実務で学んだ技術を基に, タスク管理用のWebアプリケーションを開発する

## 🛠️ 技術スタック

### フロントエンド

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

### バックエンド & クラウド

![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS_Lambda-FF9900?style=for-the-badge&logo=aws-lambda&logoColor=white)
![Amazon API Gateway](https://img.shields.io/badge/API_Gateway-FF9900?style=for-the-badge&logo=amazon-api-gateway&logoColor=white)
![Amazon Cognito](https://img.shields.io/badge/Amazon_Cognito-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![AWS CDK](https://img.shields.io/badge/AWS_CDK-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)

### ツール & 構成

![Yarn](https://img.shields.io/badge/Yarn-2C8EBB?style=for-the-badge&logo=yarn&logoColor=white)
![Monorepo](https://img.shields.io/badge/Monorepo-Yarn_Workspaces-blue?style=for-the-badge&logo=yarn)

---

## 📆 開発ログ (ヒストリー)

- **Monorepo 環境構築 (Yarn Workspaces)**
  - `packages/task-core`: 共通型定義および共有ロジック
  - `packages/task-ui`: 共通 UI コンポーネントライブラリ (TailwindCSS)
  - `packages/task-app`: Next.js ベースのフロントエンドアプリケーション
  - `packages/task-api`: AWS Lambda を利用したビジネスロジック (API)
  - `packages/task-infra`: AWS CDK によるインフラ構成管理 (IaC)

- **Task 1: DynamoDB の階層構造と共通機能の実装** [[PR #1]](https://github.com/SHINYOUNGHO94/TaskTree/pull/1)
  - 組織階層（会社 ➔ 事業部 ➔ 部署 ➔ チーム ➔ 社員）に合わせたデータ構造の設計
  - 共通関数 `createHierarchyRecord` によるデータ変換の自動化
  - 重複コードを排除し、安全に階層を追加できるロジックを構築

- **Task 2: CI/CD 環境の構築 (ESLint, Prettier, GitHub Actions)** [[PR #2]](https://github.com/SHINYOUNGHO94/TaskTree/pull/2)
  - ESLintとPrettierによるコード品質の自動管理
  - GitHub Actionsによる自動ビルドとLintチェックの自動化
  - 実務で使われる `--immutable` などの設定を適用

- **Task 3: AWS インフラ構築と API 実装 (DynamoDB / API Gateway)** [[PR #3]](https://github.com/SHINYOUNGHO94/TaskTree/pull/3)
  - AWS CDKによるDynamoDB、API GatewayのIaC化
  - `BaseRepository<T>` による共通ロジックの集約と型安全性の確保
  - 絶対パス（@/）の導入によるプロジェクトの可読性向上

- **Task 4: AWS Cognito 連携とログイン画面の実装** [[PR #4]](https://github.com/SHINYOUNGHO94/TaskTree/pull/4)
  - AWS Cognitoによるユーザー認証基盤の構築
  - 認証ロジックを `@task/core` に集約し、フロントエンドと分離
  - `zod` と `react-hook-form` によるバリデーションとエラー表示の実装
  - ログイン状態に基づいた画面遷移とログアウト機能の実装

- **Task 5: ダッシュボードの実装と API データ連携** [[PR #5]](https://github.com/SHINYOUNGHO94/TaskTree/pull/5)
  - AWS CDKによるAPI Gateway、DynamoDB、Lambdaのデプロイ
  - AWS Amplify v6 による自動認証トークン送信の設定
  - 画面のコンポーネント分割によるメンテナンス性の向上
  - タスクの新規登録および一覧表示機能の実装

- **Task 6: タスク管理機能の完成と組織情報の表示** [[PR #6]](https://github.com/SHINYOUNGHO94/TaskTree/pull/6)
  - タスクのCRUD機能（作成・表示・編集・削除）をすべて実装
  - ユーザーの所属組織（会社・部署など）をサイドバーに表示
  - GSIによる高速なデータ取得とインフラの最適化

- **Task 7: ユーザー登録機能の実装と認証フローの改善** [[PR #7]](https://github.com/SHINYOUNGHO94/TaskTree/pull/7)
  - Cognitoを利用したユーザー新規登録とメール認証機能の実装
  - ログイン時の画面のちらつきと無限リダイレクト問題を解決
  - ログアウト時に発生するネットワークエラー（CORS）を防止し、動作を安定化

- **Task 8: 組織管理画面と招待ログインフローの完成** [[PR #8]](https://github.com/SHINYOUNGHO94/TaskTree/pull/8)
  - 組織図（部署・チーム）をツリー形式で表示するUIへ改善
  - 管理者からの招待と、初回ログイン時のパスワード変更機能を実装
  - 組織作成時のバックエンド（AWS Lambda）の権限設定を修正
