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

### AI 活用手法の詳細

#### Claude Code ハーネスを活用したエージェント開発

v2.0.0 では Claude を単なるチャット補助ではなく、**Claude Code（CLI）のハーネス機能を通じてプロジェクト構造を把握させたエージェントとして運用**している。

- `CLAUDE.md` / `AGENTS.md` / `docs/core` をプロジェクトルートに配置し、Claude がセッション開始時に自動でコンテキストを読み込む仕組みを整備
- Claude Code の hooks（SessionStart / UserPromptSubmit）でモード設定や補助コンテキストを自動注入し、毎回同じ指示を手動で与える必要をなくした
- フォルダ構造・パッケージ境界・コーディング規則・権限設計を `docs/core` に集約し、Claude が「どこを読めばよいか」を即座に把握できる状態を維持
- 結果として、Claude は単なるコード生成ではなく、**既存の設計方針・実装スタイル・パッケージ境界を尊重しながら修正提案・実装・レビューを行うエージェント**として機能する

#### Repomix によるトークン節約

大規模コンテキストが必要な場面（複数パッケージにまたがる調査・Gemini / GPT への一括レビュー依頼など）では **Repomix** を活用してトークンコストを最適化している。

- Repomix はリポジトリ全体（または指定パス）を単一のテキストファイルに変換するツール
- ファイルツリー・各ファイル内容・言語情報を構造化して出力するため、AI がリポジトリ全体を把握するのに必要なコンテキスト量を大幅に削減できる
- 具体的な運用：Claude Code セッションでは核心ファイルのみ直接 Read、Gemini や GPT に渡す際は Repomix 出力を使用して一括コンテキストとして提供
- `AGENTS.md` に Repomix の使用ルール（対象パス・除外パス・出力形式）を明記し、AI ごとに最適なコンテキスト量を調整

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

### Task 17: Case 権限・割当 record 正式化

- Case read permission を `casePermissionService` に寄せ、detail / history / comments / tasks / participant companies の読み取り条件を統一した
- `CaseAssignmentRecord` / `CaseVisibilityRecord` を追加し、`byAssignee` / `byVisibility` GSI で正式 record を検索する構成へ移行した
- `GET /cases` を `COMPANY` / `DIVISION` / `DEPARTMENT` / `TEAM` / `USER` の assignment / visibility に対応させ、`requiredRole` を考慮して一覧取得するようにした
- Case 作成、child case 作成、status 更新では Case 本体と assignment / visibility record を transaction で同期し、access record だけ欠ける状態を防ぐようにした
- Claim approval では旧 owner assignment の削除、新 owner assignment、visibility record、Case 更新、claim 更新を同じ transaction に含め、stale assignment が残らないようにした
- 外部 participant company は `OPEN` かつ `ACTIVE` の場合だけ読み取り可能とし、`DIRECT` case や `INVITED` / `REJECTED` / `REMOVED` 状態では読み取り不可にした
- Dashboard の外部案件招待一覧では、`INVITED` 状態の detail link を表示しないようにした

**Deployment Impact:**
- new Lambda: no
- new API route: no
- new DynamoDB table: no
- new DynamoDB GSI: no（既存 `byAssignee` / `byVisibility` を再利用）
- IAM permission change: yes（Case 作成 / child case 作成 / status 更新 / claim approval 系 Lambda に transaction / delete 系権限を追加）
- deployment required: yes

**Verification:**
- `yarn.cmd type-check:api` — pass
- `git diff --check` — pass（CRLF warning only）

### Task 18: Case 検索・UI 導線・E2E 安定化

- Dashboard Case area に search / filter / sort を追加し、既存 `GET /cases` の結果を client-side で絞り込み・並び替えできるようにした
- Search 対象: title / description / caseId / caseType / status（部分一致）
- Filter: caseType（ALL/REQUEST/STANDARD/PROJECT）、status（ALL/全 CaseStatus）、deliveryType（ALL/DIRECT/OPEN）、ownership（ALL/自分が作成/自分が担当）
- Sort: updatedAt desc / createdAt desc / dueDate asc / status / caseType
- Case 一覧に List / Board view toggle を追加した
  - Board view は全 CaseStatus（IN_PROGRESS / REVIEW_REQUESTED / WAITING / REOPENED / ON_HOLD / COMPLETED / CANCELED）ごとの column 表示
  - `CaseBoardView` を新規コンポーネントとして追加した
- Case 一覧 → Case 詳細 → Dashboard 戻りの導線を整理した
  - 一覧クリック時に view state（caseView, caseType, status, deliveryType, ownership, sort, q）を URL query string に載せる
  - 詳細画面の「戻る」ボタンが URL params を読んで filter / sort / view を復元した状態で Dashboard に戻る
- casesError 発生時に「再試行」ボタン、invitationsError 発生時にも「再試行」ボタンを追加し `alert()` 非依存にした
- フィルター結果 0 件時に「フィルターをリセット」ボタンを表示し、empty state を明確にした
- Playwright E2E smoke tests を追加した（`tests/e2e/dashboard-smoke.spec.ts`）
  - public routes: login page / signup page / unauthenticated dashboard redirect
  - authenticated smoke: TEST_USER_EMAIL / TEST_USER_PASSWORD 環境変数がない場合は自動 skip
  - authenticated smoke では search / filter / sort / board-list toggle の基本操作を確認する

**Deployment Impact:**
- new Lambda: no
- new API route: no
- new DynamoDB table: no
- new DynamoDB GSI: no
- IAM permission change: no
- deployment required: no

**Verification:**
- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass
- `yarn.cmd workspace @task/infra build` — pass
- `yarn.cmd workspace @task/infra cdk synth` — pass
- `yarn.cmd test:api` — 294 tests pass
- `yarn.cmd test:e2e` — 5 passed, 3 skipped (authenticated tests skipped: TEST_USER_EMAIL/TEST_USER_PASSWORD not set)

### Task 19: UI 改善と組織管理の運用機能追加

- Dashboard と Case 詳細画面を、実運用で確認しやすい情報密度・パネル構成・エラー表示へ調整した
- Case コメント作成と子 Case 一覧取得の権限判定を、Case 詳細 API と同じ読み取り権限ポリシーに統一した
- `requiredRole` の確認と、OPEN case に参加している ACTIVE 外部会社のアクセス許可を反映した
- 組織管理画面で、事業部・部署・チームの名前変更と削除を行えるようにした
- `/division/{id}`、`/department/{id}`、`/team/{id}` に `PUT` / `DELETE` API を追加し、ロール別に操作範囲を制限した
  - `COMPANY_ADMIN`: 自社の事業部・部署・チームを管理可能
  - `DIVISION_ADMIN`: 自分の事業部配下の部署・チームを管理可能
  - `DEPT_ADMIN`: 自分の部署配下のチームを管理可能
- 下位組織や所属メンバーが残っている場合は削除できないようにした
- 組織削除時の下位組織・ユーザー確認では `companyId` を用いて tenant 分離を維持した
- 組織更新 API で不正な JSON を受け取った場合、500 ではなく 400 を返すようにした

**デプロイ影響:**
- 新規 Lambda: 組織更新・削除用に 6 個追加
- 新規 API route: 組織更新・削除用に 6 route 追加
- 新規 DynamoDB table: なし
- 新規 DynamoDB GSI: なし
- IAM 権限変更: あり。組織更新・削除 Lambda に `GetItem`、`Query`、必要な write action を付与
- デプロイ要否: 必要

**検証:**
- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass
- `yarn.cmd test:api` — 349 tests pass

### Task 20: 組織管理 UI コンポーネント分離・i18n エラーメッセージ・オンボーディング組織生成修正

- 組織管理 page (`dashboard/team/page.tsx`) を責務ごとのコンポーネントへ分離した
  - `page.tsx` はデータ取得・mutation handler・モーダル開閉状態を管理する
  - `OrgTree`、`MemberTable`、`OrgEditModal`、`OrgDeleteConfirmModal`、`CreateDivisionModal`、`CreateDepartmentModal`、`CreateTeamModal`、`InviteMemberModal` を `packages/task-app/src/components/dashboard/team/` に追加した
  - `orgPermissions.ts` に `OrgTarget` 型・`orgTypeLabel`・`ORG_ALLOWED_ROLES` を集約した
  - `orgError.ts` に Amplify REST エラーからサーバーメッセージを安全に取り出す `extractOrgError` ヘルパーを追加した
- `react-i18next` / `i18next` を `task-app` に追加し、組織管理画面の API エラーメッセージを i18n 化した
  - 対応言語: `en`、`ja`、`ko`（fallback: `ja`）
  - ブラウザ言語を `navigator.language` で自動検出し、`I18nProvider` が `useEffect` でマウント後に切り替える
  - create / update / delete の全エラー表示に `t(extractOrgError(err))` を適用した
  - サーバーの英語エラーメッセージ文字列を i18n key として使用し、API 側の変更は不要
- 新規ユーザー登録時（`postConfirmation` Lambda）の初期組織生成を v2 構造に合わせた
  - 旧: `divisionId="NONE"` の `一般部署` を生成していた
  - 新: `管理本部` (Division) + `管理部` (Department) を生成し、COMPANY_ADMIN ユーザーを所属させる
  - ID は `DIV-${userId.slice(0, 8)}` / `DEPT-${userId.slice(0, 8)}` 形式で生成する
  - `PostConfirmationDeps` に `DivisionRepository` を追加した
  - 既存 DB の `一般部署` レコードは自動削除しない。対象ユーザーの所属を新組織に変更後、手動削除が可能
- メンバー招待時のロールと所属の整合性を強化した
  - `TEAM_ADMIN` は自分のチーム、`DEPT_ADMIN` は自分の部署、`DIVISION_ADMIN` は自分の本部をサーバー側で強制する
  - `COMPANY_ADMIN` を招待する場合は本部・部署・チームに所属させず、会社全体の管理者として扱う
  - 招待 UI でもロールとログインユーザーの権限に応じて、選択できる所属範囲を制限した
- 所属メンバーが残っている組織を整理できるよう、メンバー削除機能を追加した
  - `DELETE /user/{id}` を追加し、Cognito ユーザーと DynamoDB の User record を削除する
  - 自分自身の削除、他社ユーザーの削除、権限範囲外ユーザーの削除を禁止する
  - `MemberTable` に削除ボタンを追加し、削除権限がある行にのみ表示する
  - ブラウザ標準 confirm ではなく、専用の削除確認モーダルで操作を確認する

**注意:** 既存 DB に残っている `divisionId="NONE"` の `一般部署` は自動削除しません。対象ユーザーの部署を新組織へ変更した後、管理者が手動で削除できます。

### Task 21: Case-first Dashboard ワークフロー整理

**Dashboard 変更:**

- Dashboard 上部の `REQUEST 案件` 単独ボタンと `新規タスク作成` プライマリーボタンを削除し、`案件作成` 1 ボタンに統合した
- 案件一覧に `自分の案件 / 公開案件 / 組織案件 / プロジェクト` の 4 タブを追加
  - クライアント側フィルタリング: `自分の案件` = creatorId/ownerId が自分、`公開案件` = deliveryType OPEN、`組織案件` = targetScope が USER 以外、`プロジェクト` = caseType PROJECT
  - タブ切り替え時に検索・フィルターをリセットし、空画面誤認を防止
- v1 個人タスクを `個人タスク（旧）` セクションに折りたたみで格納し、Case 配下タスクと混同しないよう UI を分離した

**CreateCaseModal 改善:**

- `deliveryType`（DIRECT/OPEN）・`targetScope`（COMPANY〜USER）・`requiredRole` 選択を追加
- targetScope 別の targetScopeId 自動 fallback を廃止し、必要な選択は必須化した
  - COMPANY_ADMIN が DIVISION/DEPT/TEAM/USER を選ぶ場合は必ず選択が必要
  - DIVISION_ADMIN: 自 division 自動、下位は選択必須
  - DEPT_ADMIN: 自 dept 自動、下位は選択必須
  - TEAM_ADMIN: 自 team 自動、USER は選択必須
  - USER/GUEST: 自分自身のみ自動
- targetScope = USER 選択時は deliveryType を DIRECT に固定し、requiredRole を USER に強制する
- 組織 selector は `OrgService.getDivisions / getDepartments / getTeams` と `UserService.getCompanyUsers` を使用
  - 各選択で下位を連鎖フィルタリング（division → dept → team → user）
  - 送信先選択（ `*` 必須）と絞り込み（任意フィルター）をラベルで区別
- org data fetch を `Promise.all` で一括取得し、一つでも失敗したら orgError を表示して再試行ボタンを提供
- フォーム下部に送信先確認サマリー（送信先名・配信方式・閲覧権限）を表示

**API / DynamoDB / GSI / IAM 変更なし**（フロントエンドのみの修正）

**検証 (Task 21 追加分):**

- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass

**残存 gap (case-collaboration-model.md 対比):**

- 公開案件タブの claim 状態別 UI（申請可能 / 申請中 / 自分の申請）は未実装（Task 13 で claim API は実装済み）
- 組織案件の厳密なサーバー側フィルタリング未実装（現在は targetScope !== USER のクライアント近似値）
- OPEN case 専用探索画面は未実装
- Case task の編集 / 削除 / 承認フローは未完成

**デプロイ影響:**
- Lambda コード変更: `PostConfirmationFunction`、`InviteUserFunction`
- 新規 Lambda: `DeleteUserFunction`
- 新規 API route: `DELETE /user/{id}`
- 新規 DynamoDB table / GSI: なし
- IAM 権限変更: あり。`DeleteUserFunction` に DynamoDB `DeleteItem` と Cognito `AdminDeleteUser` を付与
- Cognito trigger: 変更なし
- デプロイ要否: 必要

**検証:**
- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass
- `yarn.cmd test:api` — 349 tests pass

### Task 22: レガシータスクフロー削除

v1 の standalone task flow（個人タスク）を v2 コードベースから完全に削除し、Dashboard を Case-first 構成に一本化した。

**削除したファイル:**

- `packages/task-app/src/components/dashboard/CreateTaskModal.tsx`
- `packages/task-app/src/components/dashboard/TaskCard.tsx`
- `packages/task-app/src/components/dashboard/EmptyTaskState.tsx`
- `packages/task-app/src/components/dashboard/EditTaskModal.tsx`
- `packages/task-app/src/app/dashboard/tasks/[id]/page.tsx`（route `/dashboard/tasks/{id}` 廃止）
- `packages/task-core/src/task/TaskService.ts`
- `packages/task-core/src/types/task.ts`（TaskStatus, TaskLevel, AccessScope, CreateTaskInput, UpdateTaskInput を含む）
- `packages/task-api/src/aws/handlers/task/` 以下 5 ファイル（createTask, getTasks, getTask, updateTask, deleteTask）
- `packages/task-api/src/repositories/taskRepository.ts`
- `packages/task-api/src/aws/entities/items/taskRecord.ts`

**修正したファイル:**

- `packages/task-app/src/app/dashboard/page.tsx`: legacy task state/handler/import/UI セクションを全て削除。Dashboard は案件作成ボタンと 4 タブ Case 一覧のみ。
- `packages/task-core/src/index.ts`: `./types/task`・`./task/TaskService` エクスポート削除
- `packages/task-infra/lib/task-infra-stack.ts`: 5 Lambda 定義（GetTasksFunction, CreateTaskFunction, GetTaskFunction, UpdateTaskFunction, DeleteTaskFunction）と `/tasks`・`/tasks/{id}` API Gateway ルートを削除
- `packages/task-infra/lib/task-infra-stack.ts`: legacy task 専用になっていた Scan 権限 helper も削除

**確認済み v2 CaseTask 保持ファイル:**

- `packages/task-api/src/aws/handlers/case/getCaseTasks.ts` — 保持
- `packages/task-api/src/aws/handlers/case/createCaseTask.ts` — 保持
- `packages/task-api/src/repositories/caseTaskRepository.ts` — 保持
- `packages/task-api/src/aws/entities/items/caseTaskRecord.ts` — 保持
- `/cases/{id}/tasks` API ルート — 保持
- Case 詳細画面の CaseTask 一覧・作成 UI — 保持

**削除した API ルート:**

- `GET /tasks`
- `POST /tasks`
- `GET /tasks/{id}`
- `PUT /tasks/{id}`
- `DELETE /tasks/{id}`

**デプロイ影響:**

- CDK deploy 必要
- 削除 Lambda: GetTasksFunction, CreateTaskFunction, GetTaskFunction, UpdateTaskFunction, DeleteTaskFunction
- 削除 API route: `/tasks`、`/tasks/{id}`
- DynamoDB テーブル / GSI 変更: なし（既存データは残存するが v2 では参照しない）
- IAM 変更: 削除 Lambda 分の権限が自動解除

**検証:**

- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass（`/dashboard/tasks/{id}` ルート消滅を確認）
- `yarn.cmd workspace @task/infra build` — pass
- `yarn.cmd test:api` — 317 tests pass（legacy task テストは削除済み）

---

### Task 23: Case 表示名と UI ラベル整備

Case 関連画面で UUID がそのまま表示される問題を解消し、enum 値を日本語ラベルで表示するよう改善した。

**UUID 表示解消（フロントエンドのみ）:**

- `comment.authorId` → `UserService.getCompanyUsers()` で取得したユーザーマップから `name → email → shortId` の順で解決
- `req.requesterId`（担当希望一覧）→ 同上で名前表示
- `caseDetail.creatorId`（案件仕様サイドバー）→ 同上で名前表示
- `caseDetail.ownerId`（担当欄）→ `ownerType === USER` 時は名前表示、それ以外は短縮 ID
- `caseDetail.targetScopeId`（公開範囲欄）→ `targetScope === USER` 時は名前表示、それ以外は短縮 ID
- `caseHistory.actorId`（履歴）→ 操作者名を履歴行に表示
- hover title でも userId をそのまま出さず、表示名または短縮 ID を出すよう統一

**enum 日本語ラベル化:**

- `CaseType` バッジ（Case 詳細、CaseCard、子案件、外部招待一覧）: REQUEST→依頼、STANDARD→通常案件、PROJECT→プロジェクト
- `CaseStatus` バッジ（外部招待一覧）: 日本語表示に統一
- Dashboard の種別 / 配信 filter: REQUEST / STANDARD / PROJECT / DIRECT / OPEN を日本語ラベル化
- Case 作成 modal の見出し、種別選択、配信方式選択を日本語ラベル化
- 子案件の hardcoded "STANDARD" / "REQUEST" 文字列を label 化

**追加ファイル:**

- `packages/task-app/src/components/dashboard/caseLabels.ts`: 共通 helper
  - `CASE_TYPE_LABELS`, `CASE_DELIVERY_TYPE_LABELS`, `CASE_STATUS_LABELS`, `CASE_TARGET_SCOPE_LABELS`, `CLAIM_STATUS_LABELS`, `CASE_TASK_STATUS_LABELS`
  - `shortId(id)`: 先頭 8 文字 + "…"
  - `resolveDisplayName(id, userMap)`: name → email → shortId の順で fallback

**変更ファイル:**

- `packages/task-app/src/app/dashboard/cases/[id]/page.tsx`: UUID 解消・ラベル化
- `packages/task-app/src/components/dashboard/CaseCard.tsx`: caseType / status ラベルを共通 helper へ統一
- `packages/task-app/src/components/dashboard/CreateCaseModal.tsx`: 作成 modal の raw enum 表示を日本語化
- `packages/task-app/src/app/dashboard/page.tsx`: filter と招待カードの caseType / status / deliveryType ラベル化
- `packages/task-app/src/app/dashboard/cases/[id]/page.tsx`: Case 詳細内の status / delivery / target scope / task status label を共通 helper へ統一

**API 変更:** なし。フロントエンドのみ修正。

**デプロイ影響:** なし。CDK deploy 不要。app build / hosting deploy のみ。

**検証:**

- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass
- `yarn.cmd test:api` — 317 tests pass

---

### Task 24: CaseTask 操作フロー整備

Case 詳細の `作業一覧` を、表示専用のリストから編集可能な CaseTask 管理 UI に拡張した。

**追加 API:**

- `PUT /cases/{id}/tasks/{taskId}`: title / description / status / assigneeId / dueDate の部分更新
- `DELETE /cases/{id}/tasks/{taskId}`: CaseTask 削除

**UI:**

- CaseTask 行に `編集` / `削除` 操作を追加
- 編集 modal で title、description、status、assignee、dueDate を変更可能
- 削除 confirm modal を追加
- 操作権限のない user には編集 / 削除ボタンを表示しない
- 担当者表示は Task 23 の表示名 helper を利用

**認可 / tenant 分離:**

- 更新 / 削除は Case creator、USER owner、組織 owner を管理できる admin、CaseTask creator、CaseTask assignee のみに制限
- `assigneeId` は server side で存在確認し、同一 company user のみ許可
- 他社 CaseTask、対象 Case に属さない taskId、権限のない user の操作を server side で拒否

**History:**

- `TASK_UPDATED`
- `TASK_STATUS_CHANGED`
- `TASK_ASSIGNEE_CHANGED`
- `TASK_DELETED`

**デプロイ影響:**

- CDK deploy 必要
- 新規 Lambda: `UpdateCaseTaskFunction`, `DeleteCaseTaskFunction`
- 新規 API route: `PUT /cases/{id}/tasks/{taskId}`, `DELETE /cases/{id}/tasks/{taskId}`
- DynamoDB table / GSI 変更なし
- IAM: CaseTask 更新 / 削除と History 記録に必要な DynamoDB 権限を追加

**検証:**

- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass
- `yarn.cmd test:api` — 365 tests pass

---

### Task 25: ChildCase 作成 UX 整備

Case 詳細画面で、親子 Case の作成導線と Server 側制約を明確にした。

**Case 作成ボタン改善:**

- PROJECT 詳細: `+ 標準案件を作成` ボタンを表示（child type は STANDARD 固定）
- STANDARD 詳細: `+ 依頼案件を作成` ボタンを表示（child type は REQUEST 固定）
- REQUEST 詳細: child case 作成ボタンを表示しない
- ボタン表示権限: creator / USER owner に加えて、親 Case ownerType に応じた組織 admin も許可

**ChildCase 作成 form 改善:**

- form 上部に `作成される案件種別: 標準案件 / 依頼案件` を明示
- submit ボタン文言もタイプ別（`標準案件を作成` / `依頼案件を作成`）に変更
- enum 生値を UI に表示しない

**ChildCase 一覧 UX 改善:**

- STANDARD 詳細の child case 一覧に caseType バッジを追加（REQUEST ラベルを明示）

**Server 側 CaseType 制約（既存維持）:**

- PROJECT 親 → STANDARD child のみ
- STANDARD 親 → REQUEST child のみ
- REQUEST 親 → child 作成不可（400）
- child case type はサーバーが親 case type から決定する

**Server 側権限強化:**

- creator / USER owner に加えて、組織 owner type に応じた admin role を許可
  - COMPANY owner: COMPANY_ADMIN
  - DIVISION owner: COMPANY_ADMIN または同 division の DIVISION_ADMIN
  - DEPARTMENT owner: COMPANY_ADMIN / DIVISION_ADMIN / 同 dept の DEPT_ADMIN
  - TEAM owner: COMPANY_ADMIN / DIVISION_ADMIN / DEPT_ADMIN / 同 team の TEAM_ADMIN
- 他社 Case へのアクセスは 403

**targetScope / requiredRole 検証強化（P1 修正後）:**

- `ALLOWED_TARGET_SCOPES_BY_ROLE` による role 別 targetScope 制約を実装（root Case と同一ロジック）
  - COMPANY_ADMIN: COMPANY / DIVISION / DEPARTMENT / TEAM / USER
  - DIVISION_ADMIN: DIVISION / DEPARTMENT / TEAM / USER
  - DEPT_ADMIN: DEPARTMENT / TEAM / USER
  - TEAM_ADMIN: TEAM / USER
  - USER / GUEST: USER のみ
- 各 targetScope に応じた targetScopeId 存在確認を実装
  - COMPANY: targetScopeId が caller の companyId と一致するかを確認
  - DIVISION: `divisionRepo.findById` で存在確認、DIVISION_ADMIN は自組織のみ
  - DEPARTMENT: `deptRepo.findByCompanyId` で存在確認、DEPT_ADMIN は自部署のみ
  - TEAM: `teamRepo.findByCompanyId` で存在確認、TEAM_ADMIN は自チームのみ
  - USER: `userRepo.findByUserId` で存在確認、USER/GUEST は自分自身のみ
- `targetScope = USER` かつ `deliveryType = OPEN` の組み合わせを 400 で拒否
- `requiredRole` を作成者の role rank で動的に検証（作成者 role より高い値は 400）
- `createChildCase` Lambda の deps に `DivisionRepository`, `DepartmentRepository`, `TeamRepository` を追加
- IAM 変更不要: `grantCaseMutation` はすでに `dynamodb:GetItem` / `dynamodb:Query` を含む

**form 改善（P1 修正後）:**

- targetScope select を role 別の許可スコープに絞り込み（TEAM/USER の固定から変更）
- USER scope 選択時は deliveryType を DIRECT に自動固定
- COMPANY scope 選択時は targetScopeId に companyId を自動入力（disabled 表示）
- requiredRole select を caller の role rank 以下の全 role に拡張
- form オープン時に role に基づいた初期値を自動設定

**History（既存維持）:**

- ChildCase 作成時は `CHILD_CASE_CREATED` を親 Case の History に記録
- History 記録失敗は本処理を失敗させない

**デプロイ影響:**

- CDK deploy 不要（`grantCaseMutation` はすでに読み取り権限を含む）
- 新規 Lambda なし
- 新規 API route なし
- DynamoDB table / GSI 変更なし
- Lambda コードの deploy のみ必要

**Case 詳細画面コンポーネント分離:**

`packages/task-app/src/app/dashboard/cases/[id]/page.tsx`（2000 行超）を、責務ごとのコンポーネントに分離した。

新規作成ファイル（`packages/task-app/src/components/case-detail/`）:

- `caseDetailPermissions.ts`: 権限判定ヘルパーとロール定数を集約（`canManageCaseOwner`、`canManageCaseTask`、`CHILD_CASE_ALLOWED_SCOPES_BY_ROLE` 等）
- `CreateChildCaseForm.tsx`: 子案件作成フォーム全体。組織データ取得・カスケードセレクタ・フォーム state・`CaseService.createChildCase` 呼び出しを内包
- `CaseChildCasesSection.tsx`: 子案件階層セクション。`showChildCaseForm` を内部管理し、`CreateChildCaseForm` を条件レンダリング
- `CaseTasksSection.tsx`: 作業一覧。作成・編集・削除の mutation state と modal を内包
- `CaseHistorySection.tsx`: 履歴タイムライン（表示専用）
- `CaseCommentsSection.tsx`: コメント一覧と投稿フォーム
- `CaseParticipantCompanySection.tsx`: 参加会社一覧と招待フォーム

`page.tsx` は route パラメーター・データ取得コールバック・state 管理・セクションレイアウトのみを担当し、約 520 行に削減した。

**検証:**

- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass
- `yarn.cmd test:api` — 365 tests pass（P1/P2 修正後 新規 15 test 追加）

---

### Task 25 追記: UI デザイン全面刷新（商用品質へ）

ChildCase UX 整備と同ブランチで、アプリ全体の UI をポートフォリオレベルから実運用 SaaS レベルへ引き上げた。対象は SI 企業向け商用アプリを想定したデザイン基準。

**主な問題点（修正前）:**

- グラデーションボタン（`from-indigo-600 to-violet-600`）が各所に存在し、学生ポートフォリオのような印象を与えていた
- `hover:-translate-y-1` などのカード浮き上がりアニメーションが散在していた
- `rounded-2xl` を過剰に使用しており、エンタープライズ感が薄かった
- リストビューが 3 カラムカードグリッドであり、業務アプリとして情報密度が低かった
- テキストに `text-slate-400` / `text-slate-500` が多用されており、白背景でのコントラストが不足していた
- ダークサイドバー上で `text-slate-500` を使用しており、暗い背景でほぼ読めない状態だった
- グラデーションテキスト（`bg-clip-text text-transparent`）が見出しに使われていた
- フォントに日本語専用フォントが未指定で、OS のシステムフォント（Windows: Meiryo）にフォールバックしていた

**デザイン方針（修正後）:**

- アクセントカラーは `indigo-600` の単色に統一。グラデーションは廃止
- ボタン hover 効果は背景色変化のみ（`hover:bg-indigo-700`）。translate/shadow アニメーション全廃
- border-radius を `rounded-lg` / `rounded-md` に統一（`rounded-2xl` 廃止）
- リストビューをテーブル形式に変更（`<table>`）。ヘッダー行・分割線・行ホバーによる業務アプリ標準 UI に刷新
- 意味のある色使いのみ残す（案件タイプバッジ：violet/blue/amber、ステータスドット：各色）
- 配信方式ボタン（지명 / 공개）を視覚的に区別：지명 = `bg-slate-900`、公開 = `bg-indigo-600`
- 送信先スコープ選択ボタン：選択状態を `bg-slate-900` の無彩色で表現（色を意味伝達に使わない）

**テキスト・タイポグラフィ改善:**

- 明暗背景でのコントラスト階層を再設計
  - ライト背景：見出し `text-slate-900 font-bold`、本文 `text-slate-700`、補助 `text-slate-600`、メタ情報 `text-slate-500`
  - ダークサイドバー：主要テキスト `text-white`、次要 `text-slate-200` / `text-slate-300`、ラベル `text-slate-400`
- `antialiased` を layout に追加してフォントレンダリングを改善
- フォントを `Inter`（英数字）+ `Noto Sans JP`（日本語）に変更
  - 旧：Inter + Outfit（日本語フォント未指定、OS フォールバック）
  - 新：Inter + Noto Sans JP（無料・商用利用可・Google Fonts SIL OFL 1.1）
  - Outfit を廃止し、見出し / 本文を Inter に統一してフォント混在を解消

**CreateCaseModal 全面刷新:**

- モーダル枠：`rounded-2xl` → `rounded-lg`、`border-slate-100` → `border-slate-200`
- アクセントストリップ：グラデーション → `bg-indigo-600 h-0.5`（細く、装飾ではなくブランドアクセント）
- 案件タイプ選択：グラデーション → flat 単色（PROJECT=violet-700 / STANDARD=blue-600 / REQUEST=amber-600）
- 配信方式：同一色ボタン → カード形式で DIRECT / 公開 を明示的に区別
- 送信先スコープ：グラデーション → `bg-slate-900`（無彩色、選択状態を色で表現しない）
- 全ラベル：`text-[10px] text-slate-500 uppercase` → `text-xs font-semibold text-slate-700`
- 全入力フィールド：`rounded-xl` → `rounded-md`、`border-slate-200` → `border-slate-300`（コントラスト向上）
- submit / cancel ボタン：グラデーション + hover translate → flat `bg-indigo-600` / `border-slate-300`
- 送信先確認ボックス：indigo 系 → neutral slate 系

**組織管理画面（team/page.tsx）改善:**

- ページ見出しのグラデーションテキストと gradient アイコン背景を廃止
- 統計バッジ：multi-color（indigo/violet/blue/emerald）→ 全て `bg-white border-slate-300 text-slate-700` 統一
- 追加ボタン 3 種（本部/部署/チーム）：各色バラバラ → `text-slate-700 border-slate-300` 統一
- hover translate 全廃

**変更ファイル（デザイン関連）:**

- `packages/task-app/src/app/globals.css` — Noto Sans JP フォント追加、Outfit 廃止
- `packages/task-ui/src/styles/theme.css` — font-body / font-heading を Inter + Noto Sans JP に変更
- `packages/task-app/src/app/dashboard/layout.tsx` — antialiased 追加、ローディング画面 gradient 廃止
- `packages/task-app/src/app/dashboard/page.tsx` — リストビューをテーブルに変更、ボタン・タブ・フィルター・empty state・招待セクション全刷新
- `packages/task-app/src/app/dashboard/team/page.tsx` — 見出し・統計バッジ・ボタン刷新
- `packages/task-app/src/components/dashboard/Sidebar.tsx` — bg gradient 廃止・nav アイテム flat 化・テキストコントラスト全体再設計
- `packages/task-app/src/components/dashboard/DashboardHeader.tsx` — gradient テキスト廃止・hover translate 廃止・コントラスト改善
- `packages/task-app/src/components/dashboard/CaseCard.tsx` — hover lift 廃止・shadow 廃止・`rounded-2xl` → `rounded-lg`
- `packages/task-app/src/components/dashboard/CaseBoardView.tsx` — カラムの `rounded-2xl` / shadow 廃止
- `packages/task-app/src/components/dashboard/CreateCaseModal.tsx` — モーダル全体デザイン刷新（詳細は上記）
- `packages/task-app/src/components/dashboard/team/*.tsx` — 全モーダルの rounded / border / shadow 統一

**ライセンス確認:**

全依存パッケージとフォントがオープンライセンス（MIT / Apache-2.0 / SIL OFL 1.1）であることを確認。商用利用に問題なし。

**API / デプロイ影響:** なし。フロントエンドのみ修正。CDK deploy 不要。

### Task 25 追記: 軽微改善（lint・デフォルトビュー）

**lint 警告修正:**

- `packages/task-app/src/app/dashboard/cases/[id]/page.tsx` — 未使用 import `UserRole` 削除
- `packages/task-app/src/app/dashboard/page.tsx` — 未使用 import `CaseCard` 削除
- `packages/task-app/src/components/dashboard/team/OrgTree.tsx` — 未使用 import `Building` 削除

**バードビューのデフォルト化:**

- 案件リスト画面のデフォルト表示を `"list"` → `"board"` に変更
- ビュー切り替えトグルのボタン順序をバード（左）・リスト（右）に入れ替え（デフォルトが左側になるよう統一）
- URL パラメータ `?caseView=list` による手動上書きは引き続き有効

---

### Task 26: 取引先フロー実装（会社検索・パートナー招待・メール招待）

**目的:**

OPEN 案件への外部会社参加フローを完成させる。既存の `inviteParticipantCompany`（companyId 直接入力）だけでは実用上使えないため、会社検索 UI・取引先タブ・メール招待の 3 つを一括実装した。

**実装内容:**

**① 会社検索 API と UI**

- `GET /company/search?name=xxx` — 自社除外・名前フィルターで会社一覧返却
- `CompanyRepository.findAll()` 追加（pk="Company" QueryCommand。Scan 不使用）
- `CaseParticipantCompanySection` の招待フォームを検索 as-you-type UI に刷新
  - 300ms debounce で検索 → 候補リスト表示 → クリック選択 → 招待

**② 取引先タブ（新規ページ）**

- サイドバーに「取引先」タブ追加（`Handshake` アイコン）
- `packages/task-app/src/app/dashboard/partners/page.tsx` 新規作成
  - 未対応招待（承認待ち）セクション：受領した案件招待を一覧表示、参加・拒否ボタン
  - 協業履歴テーブル：過去の参加会社ステータスを表形式で表示

**③ メール招待フロー（未登録会社向け）**

問題: 検索ベースの招待は相手がすでに登録済みの場合のみ機能する。未登録会社を招待できなかった。

解決: 既存の `inviteUser`（`AdminCreateUserCommand`）と同じ仕組みを会社間招待に適用。SES 不要。Cognito が招待メールを自動送信。

フロー:
1. A社が OPEN 案件から相手のメールアドレスを入力 → `POST /company/invite-by-email`
2. `CompanyEmailInvitation` record を DynamoDB に保存（email + caseId + status=PENDING）
3. Cognito `AdminCreateUserCommand` → 招待メール自動送信（相手が既登録の場合は invitation record のみ保存）
4. B社代表がメールからログイン → `postConfirmation` 発火 → 新会社自動生成
5. B社代表が取引先タブ「メール招待」セクションで確認 → 「参加する」
6. `POST /company/email-invitations/{id}/accept` → `participantCompany` record 生成（ACTIVE） + invitation ACCEPTED

**補足: postAuthentication Cognito trigger**

- `AdminCreateUserCommand` で作成されたユーザー（メール招待経由）は `postConfirmation` が発火しない
- `postAuthentication` trigger を追加し、初回ログイン後に DynamoDB user record が未作成のユーザーを補完する
- 既存 user record がある場合は即時 return（冪等）
- 会社・事業部・部署・ユーザー record を `ConditionalCheckFailedException` で重複防止しながら生成
- `PostAuthenticationFunction` Lambda を CDK に追加し、Cognito user pool の `postAuthentication` trigger に接続

**新規 Lambda・API route:**

| Lambda | route | 権限 |
|---|---|---|
| `SearchCompaniesFunction` | `GET /company/search` | DynamoDB read |
| `InviteCompanyByEmailFunction` | `POST /company/invite-by-email` | DynamoDB read+write、`cognito-idp:AdminCreateUser` |
| `GetMyEmailInvitationsFunction` | `GET /company/email-invitations` | DynamoDB read |
| `AcceptEmailInvitationFunction` | `POST /company/email-invitations/{id}/accept` | DynamoDB read+write |

**新規 DynamoDB record:**

- `CompanyEmailInvitation`: pk=`"CompanyEmailInvitation"`, sk=`Email#{email}#Case#{caseId}`
- GSI 変更なし。既存 primary key で email prefix query 対応

**変更ファイル:**

- `packages/task-api/src/repositories/companyRepository.ts` — `findAll()` 追加
- `packages/task-api/src/repositories/companyEmailInvitationRepository.ts` — 新規
- `packages/task-api/src/aws/entities/items/companyEmailInvitationRecord.ts` — 新規
- `packages/task-api/src/aws/handlers/company/searchCompanies.ts` — 新規
- `packages/task-api/src/aws/handlers/company/inviteCompanyByEmail.ts` — 新規
- `packages/task-api/src/aws/handlers/company/getMyEmailInvitations.ts` — 新規
- `packages/task-api/src/aws/handlers/company/acceptEmailInvitation.ts` — 新規
- `packages/task-infra/lib/task-infra-stack.ts` — Lambda 4 本・route 5 本追加
- `packages/task-core/src/types/case.ts` — `CompanySearchResult`・`InviteCompanyByEmailInput`・`EmailInvitation` 追加
- `packages/task-core/src/case/CaseService.ts` — `searchCompanies`・`inviteCompanyByEmail`・`getMyEmailInvitations`・`acceptEmailInvitation` 追加
- `packages/task-app/src/components/case-detail/CaseParticipantCompanySection.tsx` — 検索 UI・メール招待タブ刷新
- `packages/task-app/src/components/dashboard/Sidebar.tsx` — 取引先タブ追加
- `packages/task-app/src/app/dashboard/partners/page.tsx` — 新規

**検証:**

- `yarn lint` — クリーン
- `yarn type-check:api` — クリーン
- `yarn type-check:core` — クリーン
- `yarn workspace @task/infra cdk synth` — 全 Lambda バンドル成功・エラーなし

**④ プロフィール設定・会社名編集**

- `UserRepository.updateName()` / `CompanyRepository.updateName()` — DynamoDB `UpdateExpression` で更新
- `PUT /user/profile` Lambda — 認証済みユーザー自身の名前を更新
- `PUT /company` Lambda — COMPANY_ADMIN のみ自社名を更新
- `UserService.updateProfile()` / `UserService.updateCompanyName()` を task-core に追加
- `/dashboard/profile` ページ新規作成（名前編集 全ロール・会社名編集 COMPANY_ADMIN のみ）
- Sidebar プロフィールフッタ → `/dashboard/profile` リンク
- 組織管理ページタイトル直下に会社名表示

**⑤ CI/CD・デプロイ自動化**

- `lint-test-build.yml` — `cache: "yarn"` 追加でインストール高速化
- `deploy.yml` — OIDC (`role-to-assume`) による CD ワークフロー・`environment: production` 承認ゲート
- `release.yml` — main push 時に GitHub Release 自動生成（日付 + commit hash タグ）
- `packages/task-infra/scripts/seed-test-user.mjs` — deploy 後に Cognito + DynamoDB へテスト用アカウントを自動投入（冪等）
- `packages/task-infra/package.json` deploy スクリプトに seed 自動実行を追加

**変更ファイル:**

- `packages/task-api/src/repositories/userRepository.ts` — `updateName()` 追加
- `packages/task-api/src/repositories/companyRepository.ts` — `updateName()` 追加、`findAll()` 追加
- `packages/task-api/src/repositories/companyEmailInvitationRepository.ts` — 新規
- `packages/task-api/src/aws/entities/items/companyEmailInvitationRecord.ts` — 新規
- `packages/task-api/src/aws/handlers/company/searchCompanies.ts` — 新規
- `packages/task-api/src/aws/handlers/company/inviteCompanyByEmail.ts` — 新規
- `packages/task-api/src/aws/handlers/company/getMyEmailInvitations.ts` — 新規
- `packages/task-api/src/aws/handlers/company/acceptEmailInvitation.ts` — 新規
- `packages/task-api/src/aws/handlers/company/updateCompany.ts` — 新規
- `packages/task-api/src/aws/handlers/user/updateUserProfile.ts` — 新規
- `packages/task-infra/lib/task-infra-stack.ts` — Lambda 6 本・route 7 本追加
- `packages/task-infra/scripts/seed-test-user.mjs` — 新規
- `packages/task-infra/package.json` — deploy スクリプト更新
- `packages/task-core/src/types/case.ts` — `CompanySearchResult`・`InviteCompanyByEmailInput`・`EmailInvitation` 追加
- `packages/task-core/src/case/CaseService.ts` — `searchCompanies`・`inviteCompanyByEmail`・`getMyEmailInvitations`・`acceptEmailInvitation` 追加
- `packages/task-core/src/user/UserService.ts` — `updateProfile`・`updateCompanyName` 追加
- `packages/task-app/src/components/case-detail/CaseParticipantCompanySection.tsx` — 検索 UI・メール招待タブ刷新
- `packages/task-app/src/components/dashboard/Sidebar.tsx` — 取引先タブ追加・フッタリンク追加
- `packages/task-app/src/app/dashboard/partners/page.tsx` — 新規
- `packages/task-app/src/app/dashboard/profile/page.tsx` — 新規
- `packages/task-app/src/app/dashboard/team/page.tsx` — 会社名表示追加
- `.github/workflows/lint-test-build.yml` — yarn キャッシュ追加
- `.github/workflows/deploy.yml` — 新規（OIDC CD）
- `.github/workflows/release.yml` — 新規（自動リリース）
- `.gitignore` — `repomix-output.xml`・`diff.xml` 追加
- `packages/task-api/src/aws/handlers/auth/postAuthentication.ts` — 新規（Cognito postAuthentication trigger。メール招待ユーザーの初回ログイン時に user / company / division / department record を補完）
- `packages/task-api/src/services/casePermissionService.ts` — `canReadCaseAsParticipant` 追加（外部会社が ACTIVE participant である場合のみ Case 読み取りを許可する判定ロジック）
- `tests/e2e/login.spec.ts` — 削除（メール招待フロー導入後の旧ログイン E2E と非互換のため除去）

**検証:**

- `yarn lint` — クリーン
- `npx tsc --noEmit` (task-api / task-core) — クリーン
- `yarn workspace @task/infra cdk synth` — 全 Lambda バンドル成功・エラーなし

**API / デプロイ影響:** CDK deploy 必須。新規 Lambda 6 本・API route 7 本・IAM 変更あり。

---

### Task 27: UI 多言語対応（EN / 日 / 한）

**目的:** 画面上のすべての文字列を EN・日本語・韓国語で切り替えられるようにする。デフォルト日本語、`localStorage` で選択言語を永続化。

**設計方針:**

- 既存の `src/i18n/`（エラーメッセージ専用）は変更せず、`src/locales/` を新規追加。
- `i18next` の `addResourceBundle` で `"ui"` namespace を追加。
- キーは英語文字列、値は各言語訳。呼び出しは `useTranslation("ui")` → `t("English key")`。
- 非コンポーネントの関数（`caseLabels.ts` 等）は値を英語キーに変更し、呼び出し側で `t()` を適用。
- エラー文字列は英語キーを state に保持し、描画時に `t(errorKey)` で翻訳。
- 動的ラベルには i18next interpolation（`{{variable}}`）を使用。

**変更ファイル:**

- `packages/task-app/src/locales/en.ts` — 新規（英語）
- `packages/task-app/src/locales/ja.ts` — 新規（日本語）
- `packages/task-app/src/locales/ko.ts` — 新規（韓国語）
- `packages/task-app/src/locales/index.ts` — 新規（i18n 登録・言語切替・localStorage 連携）
- `packages/task-app/src/components/dashboard/DashboardHeader.tsx` — 言語スイッチャー UI（EN / 日 / 한）追加
- `packages/task-app/src/components/providers/I18nProvider.tsx` — 初期言語ロード
- `packages/task-app/src/components/dashboard/caseLabels.ts` — ラベル値を英語キーに変更
- `packages/task-app/src/components/dashboard/team/orgPermissions.ts` — `orgTypeLabel` を英語キー返却に変更
- `packages/task-app/src/app/dashboard/cases/[id]/page.tsx` — Case 詳細全文字列翻訳
- `packages/task-app/src/app/dashboard/page.tsx` — Dashboard 全文字列翻訳
- `packages/task-app/src/app/dashboard/layout.tsx` — レイアウト文字列翻訳
- `packages/task-app/src/app/dashboard/team/page.tsx` — 組織管理ページ翻訳
- `packages/task-app/src/app/dashboard/partners/page.tsx` — 取引先ページ翻訳
- `packages/task-app/src/app/dashboard/profile/page.tsx` — プロフィールページ翻訳
- `packages/task-app/src/components/dashboard/CreateCaseModal.tsx` — Case 作成モーダル翻訳
- `packages/task-app/src/components/dashboard/Sidebar.tsx` — サイドバー翻訳
- `packages/task-app/src/components/dashboard/CaseBoardView.tsx` — ボードビュー翻訳
- `packages/task-app/src/components/dashboard/CaseCard.tsx` — Case カード翻訳
- `packages/task-app/src/components/case-detail/CaseTasksSection.tsx` — タスクセクション翻訳
- `packages/task-app/src/components/case-detail/CaseCommentsSection.tsx` — コメントセクション翻訳
- `packages/task-app/src/components/case-detail/CaseHistorySection.tsx` — 履歴セクション翻訳
- `packages/task-app/src/components/case-detail/CaseChildCasesSection.tsx` — 子案件セクション翻訳
- `packages/task-app/src/components/case-detail/CaseParticipantCompanySection.tsx` — 参加会社セクション翻訳
- `packages/task-app/src/components/case-detail/CreateChildCaseForm.tsx` — 子案件作成フォーム翻訳
- `packages/task-app/src/components/dashboard/team/CreateDivisionModal.tsx` — 本部作成モーダル翻訳
- `packages/task-app/src/components/dashboard/team/CreateDepartmentModal.tsx` — 部署作成モーダル翻訳
- `packages/task-app/src/components/dashboard/team/CreateTeamModal.tsx` — チーム作成モーダル翻訳
- `packages/task-app/src/components/dashboard/team/OrgEditModal.tsx` — 組織リネームモーダル翻訳
- `packages/task-app/src/components/dashboard/team/OrgDeleteConfirmModal.tsx` — 組織削除確認モーダル翻訳
- `packages/task-app/src/components/dashboard/team/MemberDeleteConfirmModal.tsx` — メンバー削除確認モーダル翻訳
- `packages/task-app/src/components/dashboard/team/MemberTable.tsx` — メンバーテーブル翻訳
- `packages/task-app/src/components/dashboard/team/OrgTree.tsx` — 組織ツリー翻訳
- `packages/task-app/src/components/dashboard/team/InviteMemberModal.tsx` — メンバー招待モーダル翻訳

**検証:**

- `npx tsc --noEmit` (task-app) — クリーン

**API / デプロイ影響:** なし。フロントエンドのみ変更。

---

## v2.2.0 - Dashboard 操作性改善・状態集中表示

> v2.2.0 の開始 Task として、Dashboard のタブ UI と状態確認フローを改善した。状態 pill による集中表示、カード表示の情報強化、権限付きの案件編集を追加し、日常運用で「見たい状態の案件だけをすばやく確認・更新する」導線を整えた。

### Task A: Dashboard status pills and case edit

**Dashboard UI:**

- Dashboard の `MY` / `OPEN` / `ORG` / `PROJECT` タブボタンを拡大し、選択しやすくした
- タブ下に状態 pill を追加した
  - `All`
  - `IN_PROGRESS`
  - `REVIEW_REQUESTED`
  - `COMPLETED`
  - `WAITING`
  - `ON_HOLD`
  - `CANCELED`
  - `REOPENED`
- 各 pill に現在の検索・種別・配信・担当 filter を反映した件数 badge を表示した
- 件数 0 の pill は dim 表示にし、誤クリックを防ぐため disabled にした
- pill 列はモバイルで横スクロールできるようにした
- `All` pill は状態 filter を解除し、現在の `board` / `list` view を維持する仕様にした
- 特定状態 pill 選択時は、その状態の案件だけをカードグリッドで表示する仕様にした
- pill 選択結果が 0 件の場合、空状態と `Show all` ボタンを表示して pill を解除できるようにした
- 既存の status dropdown filter とは別に `activePill` state を持たせ、pill 操作と通常 filter 操作を分離した
- タブ変更時は pill を `All` にリセットするようにした

**CaseCard 改善:**

- カードに sub-case badge を追加した
- OPEN 案件 badge を追加した
- owner type / owner id の補助情報を表示した
- due date の状態を表示した
  - overdue は強調表示
  - 3 日以内の due date は soon 表示
  - date-only 文字列比較に変更し、UTC 起因の「今日が期限なのに overdue」になる問題を避けた
- 編集可能な案件にのみ edit button を表示するようにした
- edit button の click / keydown event propagation を抑止し、カード詳細遷移と競合しないようにした

**案件編集 UI / API:**

- `EditCaseModal` を追加し、Dashboard から title / description / dueDate を編集できるようにした
- 編集ボタン表示条件は creator または USER owner のみとした
- `CaseService.updateCase` を追加し、`PUT /cases/{id}` へ title / description / dueDate を送信できるようにした
- `updateCase` Lambda で status 以外に title / description / dueDate 更新を受け付けるようにした
- 更新時は `CaseHistoryAction.CASE_UPDATED` を記録するようにした
- `CaseHistorySection` に `CASE_UPDATED` 表示を追加した
- dueDate は `YYYY-MM-DD` 形式、`Invalid Date`、round-trip 検証を行い、`2026-02-30` のような補正される日付も 400 にするようにした
- `dueDate: null` による期限クリアを許可した

**多言語対応:**

- Dashboard status pill / edit modal / case card 追加文言を EN / JA / KO / ZH に追加した

**変更ファイル:**

- `packages/task-app/src/app/dashboard/page.tsx`
- `packages/task-app/src/components/dashboard/CaseCard.tsx`
- `packages/task-app/src/components/dashboard/CaseBoardView.tsx`
- `packages/task-app/src/components/dashboard/EditCaseModal.tsx`
- `packages/task-app/src/components/case-detail/CaseHistorySection.tsx`
- `packages/task-app/src/locales/en.ts`
- `packages/task-app/src/locales/ja.ts`
- `packages/task-app/src/locales/ko.ts`
- `packages/task-app/src/locales/zh.ts`
- `packages/task-core/src/case/CaseService.ts`
- `packages/task-core/src/types/case.ts`
- `packages/task-api/src/aws/handlers/case/updateCase.ts`
- `packages/task-api/src/aws/handlers/case/updateCase.test.ts`

**API / デプロイ影響:**

- `PUT /cases/{id}` の API contract を拡張した
- `updateCase` Lambda コード変更あり → Lambda / API の再デプロイが必要
- 新規 Lambda / API route / DynamoDB GSI: なし
- IAM 変更なし
- インフラ定義変更なし

**検証:**

- `tsc` — pass（実施報告）
- `updateCase` 関連テスト 21/21 — pass（実施報告）

---

## v2.1.0 - モバイル対応・案件フロー分化・多言語拡充

> モバイル画面への完全対応、REQUEST / STANDARD / PROJECT 三種の案件タイプの UI・権限・承認フロー分化、ログイン/会員登録/認証画面の多言語対応修正、中国語（簡体字）追加を一本化したバージョン。

### モバイルレスポンシブ対応（全ダッシュボード画面）

- サイドバーをスライドインドロワーに変更し、ハンバーガーボタン（モバイル専用）でトグル
- モバイル用のバックドロップオーバーレイを追加し、タップで閉じられるようにした
- ヘッダーをレスポンシブ化：ハンバーガーメニュー、小画面ではアイコン表示のみのログアウトボタン
- タブバーのオーバーフローを `overflow-x-auto` スクロール対応に修正
- リストビューのテーブルに `overflow-x-auto` と `min-width` を追加し、横スクロール対応
- 取引先履歴テーブルのオーバーフロー修正
- タスク行の構造を変更：ステータス・操作ボタンをモバイルでは 2 行目に折り返すよう改善
- 全セクションのパディングを `p-6` → `p-4 md:p-6` に変換
- 子案件作成フォームのグリッドを `grid-cols-1 sm:grid-cols-2` に変更（モバイルで 1 カラム）
- 担当希望カードをモバイルで縦積みレイアウトに修正

デスクトップレイアウトは変更なし。全変更は Tailwind `md:` ブレークポイント（768px）を使用。

**API / デプロイ影響:** なし。フロントエンドのみ変更。

---

### 案件タイプ別フロー分化（REQUEST / STANDARD / PROJECT）

v2.0.0 では三種の案件タイプ（REQUEST / STANDARD / PROJECT）が DynamoDB 上は別フィールドで区別されているものの、UI・権限・作成フロー・承認フローはすべて同一だった。本 Task では各タイプの目的・制約・承認フローを実装レベルで分化した。

**各タイプの目的と制約:**

| タイプ | 目的 | 子案件 | 送信先制限 |
|---|---|---|---|
| REQUEST（依頼） | チームリーダーが担当者に割り当てる小規模依頼 | なし | TEAM / USER のみ |
| STANDARD（通常案件） | 部署レベルの中規模案件 | REQUEST 子案件を作成可 | 制限なし |
| PROJECT（プロジェクト） | 大型クライアント案件 | STANDARD 子案件を作成可 | 制限なし |

**案件作成 UI 分化（`CreateCaseModal`）:**

- REQUEST 選択時は `targetScope` を TEAM / USER のみに制限し、COMPANY / DIVISION / DEPARTMENT スコープを選択不可に
- REQUEST + TEAM の組み合わせでは `deliveryType` を OPEN に自動設定
- タイプを切り替えた際に `targetScope` が許可外の場合は自動でリセット

**案件詳細 UI 分化（`/dashboard/cases/[id]/page.tsx`）:**

- REQUEST 詳細画面では「子案件」セクションを非表示（REQUEST は子案件を持てない）
- REQUEST 詳細画面では「参加会社（取引先）」セクションを非表示
- OPEN 案件の「担当申請」セクションは全タイプで維持

**承認フロー実装（`CaseChildCasesSection` / `CaseTasksSection`）:**

- 子案件または作業が `REVIEW_REQUESTED` 状態のとき、対象行に「承認」ボタンを表示
- 承認ボタン表示条件：子案件の作成者、または組織階層の上位権限ユーザー
  - `COMPANY_ADMIN`: 同社全案件を承認可
  - `DIVISION_ADMIN`: 自事業部配下の案件を承認可
  - `DEPT_ADMIN`: 自部署配下の案件を承認可
  - `TEAM_ADMIN`: 自チーム配下の案件を承認可
- 承認ボタン押下で `CaseService.updateCaseStatus(childCaseId, { status: COMPLETED })` を呼び出し
- 作業（CaseTask）の承認ボタンも同様に `canApproveByOrgRole` を適用し、上位権限ユーザーも承認可能
- `caseDetailPermissions.ts` に `canApproveByOrgRole` 関数を追加し、ChildCase / CaseTask 双方で共有

**バックエンド自動伝播（`updateCase` Lambda）:**

- 案件を `COMPLETED` に変更する前に、配下の全子案件が `COMPLETED` または `CANCELED` であることを検証（未完了の子案件が残る場合は 400 を返す）
- 子案件が `COMPLETED` になったとき、兄弟案件が全て `COMPLETED` / `CANCELED` であれば親案件を自動で `REVIEW_REQUESTED` に変更
- 自動伝播失敗はコンソールエラーのみで本処理は失敗させない（非同期継続）
- 伝播時は `CaseHistory` に `"Status auto-changed to REVIEW_REQUESTED: all sub-cases completed"` を自動記録

**デプロイ影響:**

- `task-api` の `updateCase` Lambda コード変更あり → CDK deploy 必要
- 新規 Lambda / API route / DynamoDB GSI: なし
- IAM 変更なし

**検証:**

- `yarn.cmd type-check:core` — pass
- `yarn.cmd type-check:api` — pass
- `yarn.cmd workspace @task/app lint` — pass
- `yarn.cmd workspace @task/app build` — pass

---

### 認証画面の多言語対応修正と中国語（簡体字）追加

**問題:** ログイン・会員登録・認証コード入力画面に言語スイッチャー UI は存在したが、言語切替後もテキストが変わらなかった。原因はこれらの画面が `useTranslation("ui")` を使っておらず、すべての文字列がハードコードされていたため。

**修正内容:**

- `app/page.tsx`（ログイン）、`app/signup/page.tsx`（会員登録）、`app/verify/page.tsx`（認証コード）に `useTranslation("ui")` を追加
- すべての JSX テキストを `t("English key")` パターンに変更
- Zod バリデーションメッセージを英語キー文字列に変更し、描画時に `t(errors.field.message!)` で翻訳
- エラー state も英語キーで保持し、描画時に `t(error)` で翻訳
- `verify/page.tsx` の i18next interpolation に JSX 要素を渡していたバグを修正（`{ email: <span> }` → `{ email }` 文字列）
- `locales/en.ts`、`locales/ja.ts`、`locales/ko.ts` に Auth 用キーを追加（Login / Signup / Verify / Zod バリデーション各セクション）

**中国語（簡体字）追加:**

- `locales/zh.ts` を新規作成（全キー簡体字翻訳）
- `locales/index.ts` に `"zh"` を SUPPORTED に追加、bundle 登録
- `app/page.tsx`、`app/signup/page.tsx`、`app/verify/page.tsx` の LANGS 配列に `{ code: "zh", label: "中" }` 追加
- `DashboardHeader.tsx` の LANG_OPTIONS に `{ code: 'zh', label: '中' }` 追加

**変更ファイル:**

- `packages/task-app/src/locales/zh.ts` — 新規
- `packages/task-app/src/locales/index.ts` — zh 追加
- `packages/task-app/src/locales/en.ts` — Auth キー追加
- `packages/task-app/src/locales/ja.ts` — Auth キー追加
- `packages/task-app/src/locales/ko.ts` — Auth キー追加
- `packages/task-app/src/app/page.tsx` — useTranslation 追加・zh スイッチャー追加
- `packages/task-app/src/app/signup/page.tsx` — useTranslation 追加・zh スイッチャー追加
- `packages/task-app/src/app/verify/page.tsx` — useTranslation 追加・interpolation バグ修正・zh スイッチャー追加
- `packages/task-app/src/components/dashboard/DashboardHeader.tsx` — zh スイッチャー追加

**API / デプロイ影響:** なし。フロントエンドのみ変更。

**検証:**

- `yarn.cmd workspace @task/app tsc --noEmit` — pass

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

### ダッシュボード
![ダッシュボード画面](docs/images/task_dashboard.png)

![タスク追加画面](docs/images/create_task.png)

![タスク詳細画面](docs/images/task_dashboard_detail.png)

### 組織管理
![組織管理画面](docs/images/organization_dashboard.png)

![組織追加画面](docs/images/create_org.png)

![組織メンバー追加画面](docs/images/create_org_user.png)
