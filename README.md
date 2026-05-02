# TaskTree(ポートフォリオプロジェクト)

# プロジェクトの目的

実務で学んだ技術を基に、タスク管理用のWebアプリケーションを開発する

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
