# Task 7 Request Case UI Plan

このドキュメントは、Task 6 完了後に次のチャットまたは別環境で作業を再開するための引き継ぎメモです。

TaskTree v2 の新機能は、必ず `docs/core/case-collaboration-model.md` を基準に進めます。

## 現在の完了状態

Task 6 では、v2 Case API を呼び出すための基盤を追加しました。

- `createCase` handler を `POST /cases` API route と Lambda に接続した。
- `@task/core` に `CaseService.createCase` を追加した。
- `projectId` / `parentCaseId` は Task 6 時点では受け付けず、指定された場合は 400 を返すようにした。
- `CreateRootCaseInput` を追加し、現在の root case 作成 API 契約を明確にした。
- `CaseService` と `TaskService` から `any` 型の回避コードを削除した。
- `task-infra` の Node.js 型定義を明示した。
- README に Task 6 の開発ログを追加した。

## 次に行う作業

次の作業単位は、Task 7 として扱います。

推奨ブランチ名:

```text
codex/task-7-request-case-ui
```

Task 7 の目的は、画面から `REQUEST` case を作成できる最小 UI を追加することです。

## Task 7 の目的

Task 7 では、`REQUEST` case 作成 UI だけを実装します。

`REQUEST` は、チームリーダーが自チームのメンバーへ素早く案件を提示するための軽量な作成モードです。

Task 7 では、`STANDARD` / `PROJECT` の作成 UI はまだ実装しません。

## Task 7 推奨範囲

Task 7 では、次の内容を実装します。

- dashboard から `REQUEST` case 作成 UI を開ける導線を追加する。
- `REQUEST` case 作成フォームを追加する。
- フォームは `CaseService.createCase` を呼び出す。
- 作成成功時は画面内に成功状態を表示する。
- 作成失敗時は `alert()` ではなく画面内にエラーメッセージを表示する。
- 送信中は loading 状態を表示し、二重送信を防止する。
- フォーム送信前に最低限の入力検証を行う。
- `task-app` から Lambda や DynamoDB を直接触らない。
- `@task/core` の型と `CaseService` を必ず使用する。

## 推奨フォーム項目

Task 7 の REQUEST フォームは、複雑にしすぎてはいけません。

推奨項目:

- title
- description
- deliveryType
- targetScope
- targetScopeId
- requiredRole
- dueDate

初期実装では、次のデフォルトを検討します。

```text
caseType = REQUEST
deliveryType = DIRECT
requiredRole = USER
dueDate = null
```

`targetScope` は、まず `TEAM` または `USER` を中心に扱います。

組織選択 UI が複雑になりすぎる場合は、Task 7 では次のどちらかに絞ります。

1. 自分の team を対象にする。
2. 自分自身または自 team の user を対象にする。

ただし、実装前に既存の `UserProvider` と組織データ取得状況を確認し、無理に新しい API を追加しないでください。

## Task 7 でまだ行わないこと

Task 7 では、次の内容は実装しません。

- `STANDARD` case 作成 UI
- `PROJECT` 作成 UI
- Case 一覧 UI
- Case 詳細 UI
- `getCase`
- `getCases`
- Assignment record
- Visibility record
- History record
- Comment
- Claim request
- Project API
- Child case API
- Case 配下の task 作成
- 外部会社参加 UI
- OPEN case の claim / approval UI

これらは、Task 7 の後に小さな作業単位へ分けて進めます。

## UI 方針

Task 7 の UI は、実際に使えることを優先します。

- 派手な見た目よりも、入力しやすさと状態の分かりやすさを優先する。
- 既存 dashboard のデザインと大きく乖離させてはならない。
- ボタン、入力、エラー、ローディング、空状態を省略してはならない。
- モバイルとデスクトップでテキストが崩れないようにする。
- 長い説明文や機能説明を画面内に置きすぎない。

## 実装前に確認すること

Task 7 を始める前に、必ず次を確認します。

- `repomix-output.xml` が最新か。
- `AGENTS.md`、`CLAUDE.md` または `GPT.md`、`README.md`、`docs/core/case-collaboration-model.md` を読んだか。
- `docs/workflow/task-7-request-case-ui-plan.md` を読んだか。
- `CaseService.createCase` が使用可能か。
- `CreateRootCaseInput` の現在の契約を確認したか。
- 既存 dashboard の component 構成を確認したか。
- 既存の `CreateTaskModal`、`DashboardHeader`、`UserProvider` のパターンを確認したか。

## 検証候補

Task 7 の検証候補は次の通りです。

```text
yarn.cmd type-check:core
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
```

可能であれば、開発サーバーを起動して画面を確認します。

```text
yarn.cmd dev
```

画面確認では、最低限次を確認します。

- REQUEST case 作成 UI を開ける。
- 必須項目が空の場合に送信できない。
- 送信中に loading 状態になる。
- 成功時に画面内で成功が分かる。
- 失敗時に画面内でエラーが分かる。
- 画面がモバイル幅で崩れない。

## Claude への作業指示

Claude に Task 7 を依頼する場合は、次の指示をそのまま渡します。

```text
AGENTS.md、CLAUDE.md、README.md、docs/core/case-collaboration-model.md、docs/workflow/task-7-request-case-ui-plan.md を必ず読んでください。

また、npx repomix で生成済みの repomix-output.xml も最初に確認してください。
ただし、repomix-output.xml は分析用です。直接編集してはいけません。
実際の修正は必ず原本ファイルに対して行ってください。
修正対象が決まったら、対象の原本ファイルを再度読んでから変更してください。

今回の作業は v2 Task 7 として扱います。

目的:
画面から REQUEST case を作成できる最小 UI を追加してください。

作業範囲:

1. dashboard から REQUEST case 作成 UI を開ける導線を追加してください。
2. REQUEST case 作成フォームを追加してください。
3. フォーム送信時は @task/core の CaseService.createCase を使ってください。
4. task-app から Lambda や DynamoDB を直接触ってはいけません。
5. 成功、失敗、送信中、入力不備の状態を画面内に表示してください。
6. UI は既存 dashboard の見た目と操作感に合わせてください。

まだ実装しないこと:

- STANDARD case 作成 UI
- PROJECT 作成 UI
- Case 一覧
- Case 詳細
- getCase / getCases
- Assignment / Visibility / History / Comment / Claim request
- Project / Child case
- Case 配下の task 作成
- 外部会社参加 UI
- OPEN case の claim / approval UI

禁止:

- 既存 task を v2 の最上位案件として拡張してはいけません。
- docs/core/case-collaboration-model.md の確定事項に反する実装をしてはいけません。
- 関係のないリファクタリングをしてはいけません。
- repomix-output.xml を編集またはコミットしてはいけません。

検証してください:

- yarn.cmd type-check:core
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build

可能であれば yarn.cmd dev を起動し、REQUEST case 作成 UI の表示と基本操作を確認してください。

作業後に報告してください:

- 変更したファイル
- 実装内容
- 実行した検証コマンドと結果
- 画面確認結果
- Task 7 でまだ行っていないこと
```

## 引き継ぎメモ

Task 7 は、Case 機能を初めて画面から触れるようにする作業です。

ただし、Task 7 の目的は REQUEST 作成 UI だけです。
Case 一覧や詳細画面まで広げてはいけません。
