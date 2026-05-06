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

- **Task 1: DynamoDB の階層構造と共通機能の実装**
  - 組織階層（会社 ➔ 事業部 ➔ 部署 ➔ チーム ➔ 社員）に合わせたデータ構造を設計
  - データを自動変換する共通関数 `createHierarchyRecord` を作成
  - 重複コードを減らして、安全に新しい階層を追加できるロジックを構築

- **Task 2: CI/CD 環境の構築 (ESLint, Prettier, GitHub Actions)**
  - ESLint と Prettier を導入してコード品質を自動管理
  - GitHub Actions で、自動ビルドと Lint チェックのパイプラインを作成
  - 実務で使われる `--immutable` などの設定を適用

- **Task 3: AWS インフラ構築と API 実装 (DynamoDB / API Gateway)**
  - AWS CDK を使って、DynamoDB や API Gateway を IaC 化
  - 会社からユーザーまで、全5階層の API とリポジトリを実装
  - `BaseRepository<T>` を導入して共通ロジックを整理し、型安全性を確保
  - 絶対パスを導入して、コードの可読性を向上

- **Task 4: AWS Cognito 連携とログイン画面の実装**
  - AWS Cognito を使ったユーザー認証機能の構築
  - ログイン画面の作成
  - 認証ロジックを `@task/core` にまとめて、フロント側との役割を分離
  - `zod` と `react-hook-form` を使って、入力チェックとエラー表示を実装
  - ログイン状態に合わせて、画面のリダイレクトやログアウト機能を実装
