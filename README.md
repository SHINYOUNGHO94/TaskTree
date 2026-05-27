# TaskTree v2 (案件・タスク管理プラットフォーム)

🌐 **ライブデモ: [https://tasktree-eight.vercel.app](https://tasktree-eight.vercel.app)**

以下のデモアカウント、または新規会員登録にてご利用いただけます。

- Email: test@tasktree.dev
- Password: TaskTree123@

※デモデータは確認用のため、予告なくリセットする場合があります。

**TaskTree v2** は、組織階層・権限管理をサポートするマルチテナント型の業務・案件管理Webアプリケーションです。単なる個人用TODOアプリにとどまらず、複数企業間の協業やテナント分離を考慮した、業務アプリに近い構成を目指して設計・実装しました。

## 🛠️ 技術スタック

### フロントエンド
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![i18next](https://img.shields.io/badge/i18next-26A69A?style=for-the-badge&logo=i18next&logoColor=white)

### バックエンド & クラウド
![AWS](https://img.shields.io/badge/AWS-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![AWS Lambda](https://img.shields.io/badge/AWS_Lambda-FF9900?style=for-the-badge&logo=aws-lambda&logoColor=white)
![Amazon API Gateway](https://img.shields.io/badge/API_Gateway-FF9900?style=for-the-badge&logo=amazon-api-gateway&logoColor=white)
![Amazon Cognito](https://img.shields.io/badge/Amazon_Cognito-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)
![AWS CDK](https://img.shields.io/badge/AWS_CDK-232F3E?style=for-the-badge&logo=amazon-aws&logoColor=white)

### ツール & 構成
![Yarn](https://img.shields.io/badge/Yarn-2C8EBB?style=for-the-badge&logo=yarn&logoColor=white)
![Monorepo](https://img.shields.io/badge/Monorepo-Yarn_Workspaces-blue?style=for-the-badge&logo=yarn)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

---

## 🌟 主な特徴とアーキテクチャ

1. **堅牢なテナント分離と3段階認可 (RBAC)**
   - Cognito IdentityとDBのユーザープロファイルを紐付け、Authentication（認証）、Tenant boundary（企業境界）、Case permission（案件権限）の3段階で不正アクセスを完全にブロックします。
2. **DynamoDB シングルテーブル設計**
   - フルテーブルスキャンを排除し、`byCase`, `byAssignee`, `byVisibility` などのGlobal Secondary Index (GSI)を駆使して高速にクエリを実行します。
3. **安全なインフラ管理と最小権限 (Least Privilege)**
   - AWS CDKによるInfrastructure as Code (IaC) を採用し、Lambda関数ごとに必要なAPIアクセス権限のみを精密に付与しています。
4. **モノレポ（Yarn Workspaces）による責務分離**
   - フロントエンドからAPI、インフラ構築コードまで一貫してTypeScriptで管理し、モジュール間の依存方向を単方向に制限しています。
5. **企業間協業フロー (B2B)**
   - 社内の案件（REQUEST / STANDARD / PROJECT）を外部企業へ招待・共有できます。メール招待（未登録企業向け）と会社検索招待の両方に対応し、参加企業ごとに権限を分離します。
6. **多言語対応 UI（EN / 日 / 한 / 中）**
   - i18next を用いて全画面の文字列を英語・日本語・韓国語・中国語（簡体字）に切り替えられます。ログイン・会員登録・認証画面を含む全画面でヘッダーの言語スイッチャーから即時切替でき、選択言語は `localStorage` に永続化されます。

---

## 📦 パッケージ構造 (Monorepo)

```text
packages/
  ├── task-app    # Next.js App Router (フロントエンド)
  ├── task-core   # 共通型定義・APIクライアント層
  ├── task-api    # AWS Lambda ハンドラー & サーバーサイドロジック
  ├── task-infra  # AWS CDK 定義ファイル
  └── task-ui     # 共通UIコンポーネント (Tailwind)
```

---

## 📆 バージョン履歴・開発ログ

本プロジェクトは大きく2つのフェーズに分けて開発されています。

- **v1.0.0 (技術検証フェーズ)**: Cognito, DynamoDB, API Gateway, CDK を用いたサーバーレスアーキテクチャと基本的な権限管理・タスク管理の技術的実現性を検証したバージョン。
- **v2.0.0（業務アプリ品質改善フェーズ）**: AIエージェントチーム（Claude / GPT / Gemini）を活用しながら、RBAC・テナント分離・B2B協業フロー・CI/CD自動化・多言語UIを段階的に実装し、技術検証用ポートフォリオから、より実際の業務アプリに近い構成へ改善したバージョン。
- **v2.1.0（モバイル対応・案件フロー分化・多言語拡充）**: モバイル全画面対応、REQUEST / STANDARD / PROJECT の案件タイプ別フロー分化、ログイン・会員登録・認証画面への多言語対応拡張、中国語（簡体字）追加。
- **v2.2.0（Dashboard 操作性改善・リッチエディタ・案件詳細 UI 刷新・取引先タブ再構成・CLIENT 承認フロー・ファイル共有・通知フェーズ）**: Dashboard の状態 pill UI とカードグリッド集中表示を追加し、CaseCard の情報密度を改善。あわせて権限付きの案件編集 UI、`PUT /cases/{id}` の title / description / dueDate 更新対応、Tiptap リッチエディタと private S3 presigned URL 画像アップロードを追加。案件詳細画面を 2カラムレイアウトへ刷新（タブ型コンテンツ・sticky サイドバー・進捗バー・編集ボタン）。さらに取引先タブを「受信招待 / 送信済み招待 / 協業履歴」3タブ構成へ再設計し、`GET /cases/participant-company-sent-invitations` 新規 API・取引先グループカードビュー・会社名検索/状態フィルタを追加した。PROJECT 案件には CLIENT 参加者タイプを追加し、取引先が `REVIEW_REQUESTED` の PROJECT を承認・却下できるフローを追加した。加えて案件ごとの Files タブを追加し、private S3 と 2-step presigned upload によるファイル共有、画像 preview、権限付き download / delete に対応した。ヘッダーには通知ベルを追加し、コメント追加・状態変更を DynamoDB notification record と polling で確認できる最小通知機能を実装。さらに期限切れ・3日以内の due date を色で強調し、REQUEST / STANDARD / PROJECT 用の案件作成テンプレートを追加した。

これまでの具体的な実装フェーズ・アーキテクチャ設計・テストに関する詳細なログは、以下の別ファイルをご参照ください。

👉 **[詳細な開発履歴・Taskログ (v1.0.0 ~ v2.2.0)](docs/history/development-logs.md)**

---

## 📚 主要ドキュメント

開発・設計にあたって策定したコアとなるドキュメント群です。
- [プロダクトゴールと目標構成 (v2.0.0)](docs/core/product-goal-v2.md)
- [案件協業モデル（B2B仕様）](docs/core/case-collaboration-model.md)
- [パッケージ境界と責務](docs/core/package-boundaries.md)
- [運用品質ベースライン](docs/core/operational-quality-baseline.md)
