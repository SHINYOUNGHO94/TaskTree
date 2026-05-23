# Task 8 Case List API and UI Plan

このドキュメントは、Task 7 完了後に次のチャットまたは別環境で作業を再開するための引き継ぎメモです。

TaskTree v2 の新機能は、必ず `docs/core/case-collaboration-model.md` を基準に進めます。

## 現在の完了状態

Task 7 では、画面から `REQUEST` case を作成できる最小 UI を追加しました。

- dashboard から `REQUEST` case 作成モーダルを開ける導線を追加した。
- `CaseService.createCase` を使い、`task-app` から Lambda や DynamoDB を直接呼ばない構成を維持した。
- `REQUEST` / `DIRECT` / `USER` を固定し、自チームまたは自分宛てに小さな案件を作成できるようにした。
- 入力不備、送信中、成功、失敗を画面内で扱うようにした。
- `STANDARD` / `PROJECT` 作成 UI、Case 一覧、Case 詳細はまだ実装していない。

## 次に行う作業

次の作業単位は、Task 8 として扱います。

推奨ブランチ名:

```text
codex/task-8-case-list-api-ui
```

Task 8 の目的は、作成した case を画面で確認できるようにすることです。

## Task 8 の目的

Task 8 では、`getCases` API と Case 一覧 UI を追加します。

Task 7 で `REQUEST` case を作成できるようになりましたが、作成後に画面で case を確認できません。
そのため、Task 8 では dashboard 上に Case 一覧を追加し、ユーザーが自分に関係する case を確認できる最小の閲覧フローを作ります。

Task 8 は、単なる UI 追加ではなく、API、core service、dashboard UI をつなぐ作業として扱います。

## Task 8 推奨範囲

Task 8 では、次の内容を実装します。

- `getCases` handler を追加する。
- `GET /cases` API route と Lambda を追加する。
- `@task/core` に `CaseService.getCases` を追加する。
- dashboard で Case 一覧を取得して表示する。
- Case 一覧は、まず `REQUEST` case を中心に表示する。
- loading、error、empty state を画面内に表示する。
- 作成成功後に Case 一覧を再取得できるようにする。
- `task-app` から Lambda や DynamoDB を直接触らない。
- `@task/core` の型と `CaseService` を必ず使用する。

## Case 一覧の最小表示項目

Task 8 の Case 一覧では、最初から複雑な詳細表示を作りすぎてはいけません。

推奨表示項目:

- title
- description の短縮表示
- caseType
- status
- deliveryType
- targetScope
- dueDate
- createdAt

表示形式は、既存 dashboard の見た目に合わせます。

ただし、既存 `TaskCard` を無理に流用してはいけません。
必要であれば `CaseCard` のような専用 component を追加します。

## getCases の検索方針

Task 8 の `getCases` は、まず現在ログイン中のユーザーに関係する case を返すことを目的にします。

最初の実装では、次の範囲を優先します。

- 自分が作成した case
- 自分が targetScopeId に指定された case
- 自分の team が targetScopeId に指定された case

`division`、`department`、`company`、外部会社、OPEN case の claim 対象検索は、Task 8 では広げすぎないでください。

ただし、既存の `CaseRecord` と GSI 設計に合う形で実装し、後続で `STANDARD` / `PROJECT` / `OPEN` に拡張できる余地を残してください。

## Task 8 でまだ行わないこと

Task 8 では、次の内容は実装しません。

- `STANDARD` case 作成 UI
- `PROJECT` 作成 UI
- Case 詳細 UI
- Case 編集 UI
- Case 削除 UI
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

これらは、Task 8 の後に小さな作業単位へ分けて進めます。

## UI 方針

Task 8 の UI は、作成済み Case を確認できることを優先します。

- dashboard に Case 一覧エリアを追加する。
- 既存 task 一覧と視覚的に競合しないようにする。
- Case と Task が別概念であることが分かる表示にする。
- 派手な説明文を増やさず、実際のデータを見やすくする。
- loading、empty、error state を必ず用意する。
- モバイルとデスクトップでテキストが崩れないようにする。

## API 方針

Task 8 では、API の安全性を優先します。

- 認証済みユーザーだけが `GET /cases` を呼べるようにする。
- クライアントから渡された `companyId` や `userId` を信頼してはいけません。
- 認証情報とサーバー側で取得した user profile を基準に検索条件を決定する。
- 他社または権限外の case を返してはいけません。
- DynamoDB の Query を基本とし、広範囲 Scan に依存してはいけません。

## 実装前に確認すること

Task 8 を始める前に、必ず次を確認します。

- `repomix-output.xml` が最新か。
- `AGENTS.md`、`CLAUDE.md` または `GPT.md`、`README.md`、`docs/core/case-collaboration-model.md` を読んだか。
- `docs/workflow/task-8-case-list-api-ui-plan.md` を読んだか。
- `CaseRecord` と `CaseRepository` の現在の実装を確認したか。
- `CaseService.createCase` と同じ service pattern を確認したか。
- 既存 dashboard の component 構成を確認したか。
- DynamoDB GSI の現在の定義と検索可能な access pattern を確認したか。

## 検証候補

Task 8 の検証候補は次の通りです。

```text
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd test:api
```

可能であれば、開発サーバーを起動して画面を確認します。

```text
yarn.cmd dev
```

画面確認では、最低限次を確認します。

- Case 一覧が表示される。
- Case が 0 件の場合に empty state が表示される。
- API 失敗時に画面内エラーが表示される。
- `REQUEST` case 作成後に一覧へ反映される。
- モバイル幅で表示が崩れない。

## Claude への作業指示

Claude に Task 8 を依頼する場合は、次の指示をそのまま渡します。

```text
AGENTS.md、CLAUDE.md、README.md、docs/core/case-collaboration-model.md、docs/workflow/task-8-case-list-api-ui-plan.md を必ず読んでください。

また、npx repomix で生成済みの repomix-output.xml も最初に確認してください。
ただし、repomix-output.xml は分析用です。直接編集してはいけません。
実際の修正は必ず原本ファイルに対して行ってください。
修正対象が決まったら、対象の原本ファイルを再度読んでから変更してください。

今回の作業は v2 Task 8 として扱います。

目的:
作成済み case を画面で確認できるようにするため、getCases API と Case 一覧 UI を追加してください。

作業範囲:

1. getCases handler を追加してください。
2. GET /cases API route と Lambda を追加してください。
3. @task/core に CaseService.getCases を追加してください。
4. dashboard で Case 一覧を取得して表示してください。
5. REQUEST case 作成成功後に Case 一覧を再取得できるようにしてください。
6. loading、empty、error state を画面内に表示してください。
7. task-app から Lambda や DynamoDB を直接触ってはいけません。
8. UI は既存 dashboard の見た目と操作感に合わせてください。

検索範囲:

- 自分が作成した case
- 自分が targetScopeId に指定された case
- 自分の team が targetScopeId に指定された case

まだ実装しないこと:

- STANDARD case 作成 UI
- PROJECT 作成 UI
- Case 詳細
- Case 編集
- Case 削除
- Assignment / Visibility / History / Comment / Claim request
- Project / Child case
- Case 配下の task 作成
- 外部会社参加 UI
- OPEN case の claim / approval UI

禁止:

- 既存 task を v2 の最上位案件として拡張してはいけません。
- docs/core/case-collaboration-model.md の確定事項に反する実装をしてはいけません。
- 関係のないリファクタリングをしてはいけません。
- ソースコード、テスト名、コメント、README、設計文書に韓国語を書いてはいけません。
- any 型を使ってはいけません。
- eslint-disable で検査を回避してはいけません。
- repomix-output.xml を編集またはコミットしてはいけません。
- DynamoDB の広範囲 Scan に依存してはいけません。

検証してください:

- yarn.cmd type-check:core
- yarn.cmd type-check:api
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build
- yarn.cmd test:api

可能であれば yarn.cmd dev を起動し、Case 一覧の表示と REQUEST case 作成後の反映を確認してください。

作業後に報告してください:

- 変更したファイル
- 実装内容
- 実行した検証コマンドと結果
- 画面確認結果
- Task 8 でまだ行っていないこと
- ソースコード内に韓国語が残っていないことを確認した結果
- any 型と eslint-disable を使っていないことを確認した結果
- デプロイ影響
```

## 引き継ぎメモ

Task 8 は、Case 機能を作成だけで終わらせず、画面で確認できる状態にする作業です。

ただし、Task 8 の目的は Case 一覧までです。
Case 詳細、編集、削除、履歴、コメントまで広げてはいけません。
