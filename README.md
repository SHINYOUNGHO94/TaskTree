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

---

## v1.0.0 - 技術検証用

> 実務で学んだ技術を一通り形にし、認証・組織階層・タスク管理・AWS インフラを実装した初期バージョン。

### Monorepo 環境構築 (Yarn Workspaces)

  - `packages/task-core`: 共通型定義および共有ロジック
  - `packages/task-ui`: 共通 UI コンポーネントライブラリ (TailwindCSS)
  - `packages/task-app`: Next.js ベースのフロントエンドアプリケーション
  - `packages/task-api`: AWS Lambda を利用したビジネスロジック (API)
  - `packages/task-infra`: AWS CDK によるインフラ構成管理 (IaC)

### Task 1: DynamoDB の階層構造と共通機能の実装 [[PR #1]](https://github.com/SHINYOUNGHO94/TaskTree/pull/1)

  - 組織階層（会社 ➔ 事業部 ➔ 部署 ➔ チーム ➔ 社員）に合わせたデータ構造の設計
  - 共通関数 `createHierarchyRecord` によるデータ変換の自動化
  - 重複コードを排除し、安全に階層を追加できるロジックを構築

### Task 2: CI/CD 環境の構築 (ESLint, Prettier, GitHub Actions) [[PR #2]](https://github.com/SHINYOUNGHO94/TaskTree/pull/2)

  - ESLintとPrettierによるコード品質の自動管理
  - GitHub Actionsによる自動ビルドとLintチェックの自動化
  - 実務で使われる `--immutable` などの設定を適用

### Task 3: AWS インフラ構築と API 実装 (DynamoDB / API Gateway) [[PR #3]](https://github.com/SHINYOUNGHO94/TaskTree/pull/3)

  - AWS CDKによるDynamoDB、API GatewayのIaC化
  - `BaseRepository<T>` による共通ロジックの集約と型安全性の確保
  - 絶対パス（@/）の導入によるプロジェクトの可読性向上

### Task 4: AWS Cognito 連携とログイン画面の実装 [[PR #4]](https://github.com/SHINYOUNGHO94/TaskTree/pull/4)

  - AWS Cognitoによるユーザー認証基盤の構築
  - 認証ロジックを `@task/core` に集約し、フロントエンドと分離
  - `zod` と `react-hook-form` によるバリデーションとエラー表示の実装
  - ログイン状態に基づいた画面遷移とログアウト機能の実装

### Task 5: ダッシュボードの実装と API データ連携 [[PR #5]](https://github.com/SHINYOUNGHO94/TaskTree/pull/5)

  - AWS CDKによるAPI Gateway、DynamoDB、Lambdaのデプロイ
  - AWS Amplify v6 による自動認証トークン送信の設定
  - 画面のコンポーネント分割によるメンテナンス性の向上
  - タスクの新規登録および一覧表示機能の実装

### Task 6: タスク管理機能の完成と組織情報の表示 [[PR #6]](https://github.com/SHINYOUNGHO94/TaskTree/pull/6)

  - タスクのCRUD機能（作成・表示・編集・削除）をすべて実装
  - ユーザーの所属組織（会社・部署など）をサイドバーに表示
  - GSIによる高速なデータ取得とインフラの最適化

### Task 7: ユーザー登録機能の実装と認証フローの改善 [[PR #7]](https://github.com/SHINYOUNGHO94/TaskTree/pull/7)

  - Cognitoを利用したユーザー新規登録とメール認証機能の実装
  - ログイン時の画面のちらつきと無限リダイレクト問題を解決
  - ログアウト時に発生するネットワークエラー（CORS）を防止し、動作を安定化

### Task 8: 組織管理画面と招待ログインフローの完成 [[PR #8]](https://github.com/SHINYOUNGHO94/TaskTree/pull/8)

  - 組織図（部署・チーム）をツリー形式で表示するUIへ改善
  - 管理者からの招待と、初回ログイン時のパスワード変更機能を実装
  - 組織作成時のバックエンド（AWS Lambda）の権限設定を修正

### Task 9: 階層型アクセス制御の実装 [[PR #9]](https://github.com/SHINYOUNGHO94/TaskTree/pull/9)

  - 役職（社長・部長・リーダー）に応じた案件の閲覧範囲制御を実装
  - 下位組織の案件を上位管理者が一括管理できる階層型ロジックの構築
  - 作成者本人以外の編集・削除を制限するセキュリティガードの強化

---

## v1.1.0 - 設計の整理とシステムの安定化

> v1.0.0 で実装した機能を見直し、認証・権限・データ構造を安定化したバージョン。

### 設計整理と登録処理の改善 [[PR #13]](https://github.com/SHINYOUNGHO94/TaskTree/pull/13)

  - 設計の整理：データのルールを一つにまとめ、管理しやすいコードへ改善
  - データの重複防止：同じデータが二重に登録されるトラブルを防止し、正確なデータ管理を実現
  - 登録プロセスの改善：ユーザー登録時に発生していたエラーを修正し、全体の動作を安定化

### セキュリティパッチと設計の改善を適用 [[PR #14]](https://github.com/SHINYOUNGHO94/TaskTree/pull/14)

  - セキュリティの強化：認証されていないユーザーからの不正なAPIアクセスを完全に遮断
  - データベース権限の最適化：各機能が本当に必要な最小限の権限のみを持つようにインフラ設定を改善
  - コード品質の向上：テストがしやすい構造への変更と、フロントエンド・バックエンド間のデータ通信エラーを防止

### 認証とデータ構造の安定化 [[PR #15]](https://github.com/SHINYOUNGHO94/TaskTree/pull/15)

  - CognitoをCDKで自動作成できるようにし、手動設定に依存しない構成へ改善
  - フロントエンドで使う環境変数をデプロイ後に自動更新できるように修正
  - 組織データの項目名を統一し、フロントエンドとバックエンドのデータずれを解消

---

## v1.2.0 - テスト環境の構築

> Vitest と Playwright を導入し、API と画面の基本動作を検証できる状態にしたバージョン。

### 結合テストと E2E テストの追加

  - Vitestを導入し、ユーザー情報APIのレスポンス形式を確認
  - 日時データや未所属データが安全に処理されることをテストで確認
  - Playwrightを導入し、ログイン画面と新規登録画面の基本動作を確認

### コードレビューによる可読性の改善

  - コードから自明なコメントを整理し、全体の見通しを改善
  - 権限判定など意図が伝わりにくい箇所のコメントは維持
  - プロファイル取得失敗時の `console.log` を `console.error` に修正

---

## v2.0.0 - AI エージェントチームによるプロダクト品質への改善

> v1.x で実装した技術検証用ポートフォリオを、AI を積極的に活用して、実際に運用できるアプリケーション品質へ近づけるための開発フェーズ。

v1.x は、実務で学んだ技術を自分で設計・実装し、その理解を証明することを目的としたポートフォリオでした。  
AI は主に調査、エラー確認、実装時の補助として利用しましたが、設計判断、実装方針、動作確認、改善判断は自分で行っています。

そのため、認証、組織階層、権限管理、タスク管理、AWS インフラなどの主要技術は実装していますが、実際のアプリケーションとして見ると、UX、機能の完成度、エラー処理、テスト、運用性にはまだ改善余地があります。

v2.0.0 では、AI を単なるコード生成ツールとして使うのではなく、Claude、GPT/Codex、Gemini などを役割ごとのエージェントとして扱い、設計・実装・レビュー・テスト・改善提案を分担させながら開発を進めます。

具体的には、Claude を主な実装担当、GPT/Codex を検証・レビュー・補完修正担当、Gemini を広範囲の分析・アイデア出し・方針比較担当として活用します。  
それぞれのモデルの得意分野と利用可能なトークン量を考慮し、AI の使い方自体も設計対象として扱います。

このフェーズの目的は、v1.x のように AI を補助的なコーディングサポートとして使うだけではありません。  
プロジェクト全体の構造を理解した上で、プロンプト設計、作業手順、レビュー観点、検証方法を整備し、AI を一人の開発メンバーのようにコントロールしながら開発することを目指します。

### 追加した AI 開発基盤

- `AGENTS.md`: 全 AI エージェント共通の入口と基本ルール
- `CLAUDE.md`: Claude 向けの役割定義
- `GPT.md`: GPT/Codex 向けの役割定義
- `GEMINI.md`: Gemini 向けの役割定義
- `docs/core`: プロジェクト目標、現在の構成、パッケージ境界、コーディング規則
- `docs/workflow`: AI エージェントチームの作業フロー

### v2.0.0 の改善方針

- 技術検証用の実装から、実際に使えるアプリケーション体験へ改善する
- 認証、招待、組織管理、タスク管理のユーザーフローを整理する
- エラー表示、ローディング、空状態、入力バリデーションを強化する
- 権限管理とデータアクセス制御をより安全で分かりやすくする
- API、型定義、フロントエンド間のデータ契約を整理する
- Vitest と Playwright を活用し、重要な動作を継続的に検証できる状態にする
- AI による提案、実装、レビューの記録を残し、再現性のある開発プロセスにする

### このバージョンで証明したいこと

- AI を使った開発を、単なる自動生成ではなく、設計された開発プロセスとして扱えること
- 複数の AI モデルを役割ごとに使い分け、プロジェクト改善に活用できること
- 既存コードベースを理解した上で、AI に安全に修正させるためのドキュメントと指示系統を作れること
- 実務経験で得た設計、レビュー、検証の観点を AI 活用にも適用できること

### v2.0.0 開発ログ

### Task 1: タスク API の権限検証と入力検証の強化

- `createTask` でクライアントから渡された `companyId`、`creatorId`、`status` を信頼せず、認証済みユーザーとサーバー側のルールから値を決定するように改善
- `memberId`、`accessScope`、対象組織 ID の検証を追加し、ロールに応じて作成可能な公開範囲を制限
- `updateTask` で更新可能なフィールドを明示し、ID、作成者、担当者、所属組織などの不変フィールドを上書きできないように修正
- 不正な JSON、未認証、権限不足、存在しない組織やメンバーに対する API 応答を整理
- Vitest による API テストを追加し、権限違反、組織範囲外アクセス、入力検証、正常系を継続的に確認できるようにした
- Claude が主な実装を担当し、GPT/Codex がレビュー、追加指摘、IAM 権限の補完、検証を担当

### Task 2: タスク作成・編集 UX と API リクエスト契約の整理

- `CreateTaskInput` 型を追加し、クライアントが送るべきフィールドを明示。`id`・`companyId`・`creatorId`・`status`・`createdAt`・`updatedAt` などサーバー管理フィールドをクライアントから排除
- `UpdateTaskInput` 型を追加し、更新可能なフィールド（`title`・`content`・`status`・`level`・`limitDate`）のみを送るように制限。`id` は path parameter としてのみ使用し、API body には含めない
- `TaskService.createTask` / `updateTask` の引数を新しい型に変更。`updateTask` は undefined フィールドを除去してから送信することで、ステータス単体更新などの最小リクエストを実現
- ダッシュボードのステータス変更を `getTask` → 全体更新の流れから `{ id, status }` のみの最小更新に変更し、不要な API 呼び出しを削減
- `CreateTaskModal` で公開範囲（TEAM・DEPARTMENT・DIVISION）選択時に対象組織が未選択の場合、送信をブロックして日本語エラーメッセージをインライン表示
- 作成・更新・削除・ステータス変更の失敗時に `alert()` ではなく、画面内に日本語エラーメッセージをインライン表示するよう改善

### Task 3: 組織管理・招待 API の権限検証強化

- `createDivision`、`createDepartment`、`createTeam` に認証チェックを追加し、サーバー側で `companyId` を決定するよう変更。クライアントから渡された `companyId` を信頼しない構造に修正
- `createDivision`: `COMPANY_ADMIN` のみ作成可能。`divisionId` と `name` の入力検証を追加
- `createDepartment`: `COMPANY_ADMIN` または `DIVISION_ADMIN` が作成可能。`DIVISION_ADMIN` は自分の division 配下にのみ作成可能。`divisionId` の存在と会社所属を DB で検証
- `createTeam`: `COMPANY_ADMIN`、`DIVISION_ADMIN`、`DEPT_ADMIN` が作成可能。`DEPT_ADMIN` は自分の department 配下のみ、`DIVISION_ADMIN` は自分の division 配下の department のみに制限。各ロールで department の存在と会社所属を DB で検証
- `inviteUser`: 招待者より上位のロールを付与できないよう権限昇格を防止。ロール別の組織スコープ制限を追加（`TEAM_ADMIN` は自チームのみ、`DEPT_ADMIN` は自部署のみ、`DIVISION_ADMIN` は自事業部のみ招待可能）。division / department / team の存在、会社所属、親子関係も DB で検証
- `OrgService` の `createDivision`、`createDepartment`、`createTeam` から不要な `companyId` の送信を除去し、API 契約をサーバー側の設計と整合させた
- 組織階層の基本方針に合わせ、部署作成時は所属する事業部を必須とし、フロントエンドの「本部なし」選択を送信できないように調整
- Vitest による権限テストを 4 ファイル追加。未認証 401、権限不足 403、他 division/department への不正アクセス、権限昇格試行、組織 ID の存在・親子関係検証、正常系をカバー

### Task 4: 案件協業モデルの設計整理

- `docs/core/case-collaboration-model.md` を追加し、v2 の案件協業モデルを定義
- 既存の `company -> division -> department -> team -> user` 構造を維持しつつ、`project -> case -> child case -> task -> subtask` の案件階層を整理
- `REQUEST`、`STANDARD`、`PROJECT` の案件作成モードと、`DIRECT` / `OPEN` による案件伝達方式を定義
- `targetScope` と `requiredRole` による案件公開範囲、承認フロー、コメント、History、状態管理の方針を整理
- DynamoDB シングルテーブルの主要 GSI 検索パターンと、`自分の案件`、`公開案件`、`組織案件`、`プロジェクト` の UI 方針を整理

### Task 5: v2 Case 実装基盤の追加

- `AGENTS.md` に Repomix 使用規則と v2 Case 開発基準を追加し、AI エージェントが `case-collaboration-model.md` を基準に作業できるようにした
- `@task/core` に `CaseStatus`、`CaseDeliveryType`、`CaseType`、`CaseOwnerType`、`CaseTargetScope` と `CaseSummary` / `CaseDetail` / `CreateCaseInput` / `UpdateCaseInput` を追加
- DynamoDB に case 用の GSI として `byCase`、`byAssignee`、`byVisibility` を追加し、既存の `company`、`division`、`department`、`team`、`user` GSI は変更しない方針を維持
- 既存テーブルへの GSI 追加は 1 回のデプロイで 1 つずつ行う必要があるため、実際の適用順序を分ける運用方針を明確化
- `task-api` に `CaseRecord` と `CaseRepository` を追加し、`CaseDetail` と DynamoDB record の相互変換、保存、ID 検索の基盤を整備
- `createCase` handler を追加し、作成者情報をサーバー側で確定した上で `WAITING` 状態、`USER` owner、`targetScope`、`requiredRole` を検証して case を作成できるようにした
- Vitest による `CaseRecord` 変換テストと `createCase` の入力検証・権限検証テストを追加し、case 基盤の安全性を確認できるようにした
- 次の作業方針は `docs/workflow/task-6-case-api-plan.md` に整理

### Task 6: v2 Case API 経路とサービス層の追加

- `createCase` handler を `POST /cases` の API Gateway ルートと `CreateCaseFunction` Lambda に接続
- `@task/core` に `CaseService.createCase` を追加し、フロントエンドから Lambda や DynamoDB を直接呼ばずに case 作成 API を利用できる基盤を整備
- Task 6 では Project / Child case API をまだ実装しないため、`projectId` / `parentCaseId` は一時的に受け付けず 400 を返すように調整
- `CreateRootCaseInput` を追加し、現在の `POST /cases` が受け付ける入力契約を root case 作成用に限定
- `task-core` の API サービス層から `any` 型の回避コードを削除し、`CaseService` と `TaskService` の request body を型安全に送信するよう改善
- `task-infra` の Node.js 型定義を明示し、CDK コードで Node builtin を扱う際の型診断を安定化
- `createCase` の未対応フィールド拒否テストを追加し、関連する type-check、infra build、API テストで検証
- 既存 DynamoDB テーブルへ Case 用 GSI を追加適用する場合は 1 つずつ追加する必要があるが、開発環境では既存スタックを削除して再作成する前提のため初回作成時は同時定義可能

### Task 7: REQUEST Case 作成 UI の追加

- ダッシュボードから `REQUEST` case 作成モーダルを開ける導線を追加
- `CaseService.createCase` を利用し、フロントエンドから Lambda や DynamoDB を直接呼ばずに case を作成する構成を維持
- Task 7 では `REQUEST` / `DIRECT` / `USER` を固定し、チームリーダーが自チームまたは自分宛てに小さな案件を作成できる最小 UI を実装
- 入力必須、空白のみの入力、送信中、作成成功、作成失敗を画面内で扱い、`alert()` に依存しない UX に改善
- ユーザープロファイルの読み込み後に送信先の初期値が正しく反映されるように調整
- `STANDARD` / `PROJECT` 作成 UI、Case 一覧、Case 詳細、History、Comment、Claim request は後続 Task に分離
- `type-check:core`、`@task/app` の lint / build、およびソースコード内の `any`・lint 回避コードの混入チェックで検証

### Task 8: Case 一覧 API と Dashboard 表示の追加

- `GET /cases` API と `GetCasesFunction` Lambda を追加し、認証済みユーザーに関係する case を取得できるようにした
- `@task/core` に `CaseService.getCases` を追加し、フロントエンドから API を型付き service 経由で呼び出す構成を維持
- Dashboard に Case 一覧セクションと `CaseCard` を追加し、作成済みの `REQUEST` case を画面で確認できるようにした
- `REQUEST` case 作成成功後に Case 一覧を再取得し、作成結果が画面へ反映されるようにした
- Case record に `assigneeKey` / `assigneeSortKey` / `visibilityKey` / `visibilitySortKey` を追加し、`byAssignee` / `byVisibility` GSI で検索できるようにした
- `company` GSI と `FilterExpression` に依存した広範囲検索を避け、ユーザー・チーム単位の Query を中心にした取得方式へ改善
- loading、empty、error state を画面内で扱い、Case 一覧が 0 件または取得失敗時でも状態が分かるようにした
- `type-check:core`、`type-check:api`、`@task/app` lint / build、API テスト、CDK deploy で検証

### Task 9: Case 詳細 API と詳細画面の追加

- `GET /cases/{id}` API と `GetCaseFunction` Lambda を追加し、Dashboard の Case 一覧から個別 Case を確認できるようにした
- `@task/core` に `CaseService.getCase` を追加し、フロントエンドから API を型付き service 経由で呼び出す構成を維持
- `/dashboard/cases/[id]` 詳細画面を追加し、Case のタイトル、説明、状態、種別、公開範囲、担当、期限、作成日時、更新日時を表示できるようにした
- `getCase` では認証済みユーザーの profile と case record をサーバー側で取得し、作成者、USER owner、USER target、TEAM target の最小範囲だけ閲覧を許可
- 会社境界を先に検証し、同じ teamId でも別会社の case を閲覧できないようにした
- 詳細画面では loading、not found、access denied、error state を画面内で扱い、CaseCard からキーボード操作でも詳細画面へ遷移できるようにした
- Case 編集、削除、状態変更、History、Comment、Claim request、Case 配下 task 作成は後続 Task に分離
- `type-check:core`、`type-check:api`、`@task/app` lint / build、API テストで検証

### Task 10: Case 状態変更の追加

- `PUT /cases/{id}` API と `UpdateCaseFunction` Lambda を追加し、Case 詳細画面から status だけを変更できるようにした
- `@task/core` に `CaseService.updateCaseStatus` と `UpdateCaseStatusInput` を追加し、フロントエンドから型付き service 経由で状態変更 API を呼び出す構成を維持
- `updateCase` では認証済みユーザーの profile と case record をサーバー側で取得し、同一会社内の creator または USER owner のみ状態変更を許可
- 不正 JSON、未対応 status、存在しない case、別会社 case、権限外ユーザーの更新を拒否する API テストを追加
- Case 詳細画面に状態変更ボタンを追加し、更新中の disabled 表示、失敗時の画面内エラー、成功後の詳細再取得を実装
- History 自動記録、Comment、Approval flow、Claim request、Case 配下 task 作成は後続 Task に分離
- `type-check:core`、`type-check:api`、`@task/app` lint / build、API テストで検証

### Task 11: Case 作業実行フローの追加

- Case 詳細画面から Case に紐付く作業を作成し、同じ詳細画面で配下作業一覧を確認できるようにした
- `GET /cases/{id}/tasks` と `POST /cases/{id}/tasks` API、`GetCaseTasksFunction`、`CreateCaseTaskFunction` を追加
- `@task/core` に Case task 用の型と `CaseService.getCaseTasks` / `createCaseTask` を追加し、フロントエンドから型付き service 経由で利用する構成を維持
- DynamoDB では既存 `byCase` GSI を使い、`CaseTask#{status}#{updatedAt}#{taskId}` の `caseSortKey` で Case 配下作業を取得する構成にした
- 作業作成は同一会社内の Case creator または USER owner のみに制限し、作業一覧取得は Case 閲覧権限と同じ範囲に制限
- 不正 JSON、未対応 field、存在しない case、別会社 case、権限外ユーザーを拒否する API テストを追加
- History、Comment、Approval flow、Claim request、task 編集・削除・状態変更は後続 Task に分離
- `type-check:core`、`type-check:api`、`@task/app` lint / build、`@task/infra` build、API テストで検証

### Task 12: Case 協業ログとコメント機能の追加

- Case 詳細画面に History と Comment セクションを追加し、Case 上の協業状況を確認できるようにした
- `GET /cases/{id}/history`、`GET /cases/{id}/comments`、`POST /cases/{id}/comments` API と対応する Lambda を追加
- `@task/core` に `CaseHistoryEntry`、`CaseComment`、`CreateCaseCommentInput` と `CaseService.getCaseHistory` / `getCaseComments` / `createCaseComment` を追加
- Case 作成、Case 状態変更、Case task 作成時に `CASE_CREATED`、`STATUS_CHANGED`、`TASK_CREATED` の History を自動記録するようにした
- DynamoDB では既存 `byCase` GSI を使い、`CaseHistory#{createdAt}#{historyId}` / `CaseComment#{createdAt}#{commentId}` の `caseSortKey` で取得する構成にした
- Comment 作成では authorId と companyId をサーバー側で決定し、`content` 以外の field を拒否することでクライアントからのなりすまし入力を防止
- History / Comment の取得・作成は Case 閲覧権限と同じ範囲に制限し、別会社 case や権限外ユーザーのアクセスを拒否
- Comment 編集・削除、History の差分表示、Approval flow、Claim request は後続 Task に分離
- `type-check:core`、`type-check:api`、`@task/app` build、`@task/infra` build、API テストで検証

### Task 13: Case 担当希望と承認フローの追加

- `OPEN` Case に対して担当希望を申請し、Case 作成者または現在の USER owner が承認・却下できる基本フローを追加
- `GET /cases/{id}/claim-requests`、`POST /cases/{id}/claim-requests`、`PUT /cases/{id}/claim-requests/{claimRequestId}` API と対応する Lambda を追加
- `@task/core` に Claim Request 用の型と `CaseService.getCaseClaimRequests` / `createCaseClaimRequest` / `updateCaseClaimRequest` を追加
- DynamoDB では既存 `byCase` GSI を使い、`ClaimRequest#{status}#{createdAt}#{claimRequestId}` の `caseSortKey` で Case ごとの担当希望を取得する構成にした
- 担当希望の作成は `OPEN` Case に限定し、creator / 現在の USER owner / 重複 PENDING 申請を拒否するようにした
- 承認時は Claim Request、Case owner、他の PENDING Claim Request を transaction で更新し、中途半端な状態が残らないようにした
- 一般 requester は自分の Claim Request のみ取得できるようにし、他ユーザーの申請内容を見せないようにした
- Case 詳細画面に担当希望セクションを追加し、申請、承認、却下、loading、empty、error、submitting 状態を扱えるようにした
- Claim 申請、承認、却下を History に自動記録するようにした
- 外部会社参加、チーム・会社単位 claim、OPEN case 探索ページ、STANDARD / PROJECT 作成 UI、task 承認 flow は後続 Task に分離
- `type-check:core`、`type-check:api`、`@task/app` lint / build、`@task/infra` build、API テストで検証

### Task 14: STANDARD Case 業務フローの追加

- Dashboard から `REQUEST` / `STANDARD` Case を選択して作成できるようにした
- `GET /cases/{id}/children`、`POST /cases/{id}/children` API と対応する Lambda を追加
- `@task/core` に `CreateChildCaseInput` と `CaseService.getChildCases` / `createChildCase` を追加し、フロントエンドから型付き service 経由で子案件 API を利用する構成を維持
- `CaseHistoryAction.CHILD_CASE_CREATED` を追加し、子案件作成時に親案件の History へ自動記録するようにした
- DynamoDB では既存 `byCase` GSI を使い、`ChildCase#{status}#{updatedAt}#{childCaseId}` の `caseSortKey` で親案件配下の子案件を取得する構成にした
- 子案件作成時に `caseId (GSI PK) = parentCaseId` をセットし、`toDetail` では `record.sk` から entity 固有の caseId を復元するよう `CaseRecord` を修正した
- 子案件は `STANDARD` Case 配下のみ作成可能とし、親案件の creator または USER owner だけが作成できるように制限した
- 子案件の `targetScope = TEAM` は caller 自身のチーム ID のみ許可し、`targetScope = USER` は同じ会社・同じチームの実在ユーザーだけを許可するようにした
- Task 14 では root case の作成対象を `REQUEST` / `STANDARD` に限定し、`PROJECT` は API からも作成できないようにした
- 子案件の `requiredRole` は `USER` または `TEAM_ADMIN` に限定し、`dueDate` は `string | null` のみ受け付けるようにした
- 子案件は親案件の `projectId` を継承し、子案件から子案件を作成できないようにした
- Case 詳細画面に子案件セクションを追加し、`STANDARD` Case の creator / USER owner には子案件作成フォームを表示した
- loading、empty、error state を画面内で扱い、子案件作成後に子案件一覧と History を再取得するようにした
- PROJECT 作成 UI、PROJECT -> STANDARD -> REQUEST 階層、外部会社参加、子案件ステータス集約は後続 Task に分離
- `type-check:core`、`type-check:api`、`@task/app` lint / build、`@task/infra` build、API テストで検証

### Task 15: PROJECT 階層フローの追加

- Dashboard から `REQUEST` / `STANDARD` / `PROJECT` Case を選択して作成できるようにした
- `POST /cases` で `caseType = PROJECT` の root Case を作成できるように拡張した
- `POST /cases/{id}/children` を拡張し、親 Case の種別に応じて子 Case 種別を決定するようにした
  - PROJECT 親 → STANDARD 子（`projectId = 親 PROJECT の caseId` を設定）
  - STANDARD 親 → REQUEST 子（既存の動作を維持し、`projectId` を継承）
  - REQUEST 親 → `400` を返す
- `/dashboard/cases/[id]` 詳細画面で PROJECT 階層を表示できるようにした
  - PROJECT 詳細では child STANDARD Cases を表示し、各 STANDARD の child REQUEST Cases をネスト表示する
  - PROJECT creator または USER owner は STANDARD child Case を作成できる
  - REQUEST Case 詳細では child 作成フォームを表示しない
- `UpdateCaseClaimRequestFunction` に `dynamodb:TransactWriteItems` 権限を追加し、claim 承認 transaction の IAM 不足を修正した
- 新しい DynamoDB GSI / table / Lambda / route は追加せず、既存 `byCase` GSI を再利用した
- PROJECT root 作成、PROJECT → STANDARD child 作成、REQUEST への child 作成不可の API テストを追加した

### Task 16: 外部会社参加フローの追加

- `OPEN` Case に外部会社を participant company として招待する最初の社外協業フローを実装した
- `CaseParticipantCompanyStatus` / `CaseParticipantCompany` 型を `@task/core` に追加した
- `byParticipantCompany` GSI を DynamoDB に追加した（`participantCompanyId` pk / `participantCompanySortKey` sk）
- 以下の API を追加した
  - `POST /cases/{id}/participant-companies` — OPEN Case の creator または USER owner が外部会社を招待する
  - `GET /cases/{id}/participant-companies` — Case の参加会社一覧を取得する
  - `GET /cases/participant-company-invitations` — caller 会社に届いた招待一覧を取得する（`Scan` 不使用、GSI による Query）
  - `PUT /cases/{id}/participant-companies/{participantCompanyId}` — invited company の COMPANY_ADMIN / DIVISION_ADMIN が accept / reject する
- 既存の `GET /cases/{id}` / `GET /cases/{id}/history` / `GET /cases/{id}/comments` / `GET /cases/{id}/tasks` に ACTIVE participant company user の読み取り権限を追加した
  - INVITED のみでは detail / history / comments / tasks を読めない
  - 無関係の company user は読めない
  - owner company 内の既存認可ルールは維持した
- Case 詳細画面に参加会社セクションと招待フォーム（owner 側）を追加した
- Dashboard に外部案件招待セクション（accept / reject ボタン付き）を追加した
- loading / empty / error / partial-error state を各 UI に実装した

**Deployment Impact:**
- new Lambda: yes（4 functions）
- new API route: yes（4 routes）
- new DynamoDB table: no
- new DynamoDB GSI: yes（`byParticipantCompany`）
- IAM permission change: yes（新 Lambda に GetItem / Query / PutItem 付与）
- deployment required: yes

**Verification:**
- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass
- `yarn.cmd workspace @task/infra build` — pass
- `yarn.cmd workspace @task/infra cdk synth` — pass（GSI 追加確認）
- `yarn.cmd test:api` — 294 tests pass

---

## 開発メモ

実務で経験した画面実装、API連携、データ管理、エラー対応をもとに、このポートフォリオを作成しました。
認証、権限管理、組織階層、タスク管理の流れを一人で設計・実装しています。

実装中は、公式ドキュメントやAIツールも参考にしました。
ただし、エラー対応、設計の見直し、動作確認は自分で行いながら改善しました。

## 📸 画面イメージ
### ログイン
![ログイン画面](docs/images/login.png)

### 新規登録
![新規登録画面](docs/images/signup.png)

![認証コード入力画面](docs/images/auth_signup_code.png)

### ダッシュボード
![ダッシュボード画面](docs/images/task_dashboard.png)

![タスク追加画面](docs/images/create_task.png)

![タスク詳細画面](docs/images/task_dashboard_detail.png)

### 組織管理
![組織管理画面](docs/images/organization_dashboard.png)

![組織追加画面](docs/images/create_org.png)

![組織メンバー追加画面](docs/images/create_org_user.png)
