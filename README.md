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

- **Task 1: DynamoDB 階層構造の設計と共通機能の実装**
  - 組織階層（会社 ➔ 事業部 ➔ 部署 ➔ チーム ➔ 社員）に合わせたデータ構造を設計.
  - `createHierarchyRecord`（共通関数）を作成し、データの変換を自動化.
  - 重複するコードを減らし、安全に新しい階層を追加できるロジックを構築.

- **Task 2: CI/CD 環境構築 (ESLint, Prettier, GitHub Actions)**
  - ESLint V9導入によるコード品質管理の自動化
  - Prettier によるコードフォーマットの自動化
  - GitHub Actions を活用した自動Lint & TypeCheck & Buildパイプラインの構築
  - 実務レベルの `--immutable` および `--max-warnings 0` 戦略の適用

- **Task 3: AWSインフラ構築と全階層のAPI実装 (DynamoDB / API Gateway)**
  - AWS CDKを活用し、DynamoDBやAPI GatewayのインフラをIaC化
  - CompanyからUserまで、全5階層のAPIハンドラーとリポジトリの実装を完遂
  - `BaseRepository<T>`を導入することで、共通ロジックを共通化し、型安全性を確保
  - `@task/core`パッケージを通じて、プロジェクト全体のEnumや定数を一元管理
  - 全パッケージに絶対パスを導入し、コードの可読性とメンテナンス性を向上