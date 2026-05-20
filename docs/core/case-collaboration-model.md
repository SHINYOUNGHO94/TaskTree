# Case Collaboration Model

このドキュメントは、TaskTree v2 における案件ベースの協業モデルを定義する基準文書です。

本ドキュメントの「確定事項」は、今後の実装・レビュー・テストで必ず従う必要があります。
未確定事項は、このドキュメントで方針を確定するまで実装してはなりません。

## 現在までの確定事項サマリー

- 基本組織構造は `company -> division -> department -> team -> user` を必ず維持する。
- 案件構造は `project(optional) -> case(required) -> child case(optional) -> task(required) -> subtask(optional)` を基本とする。
- `case` は案件、`task` は案件を処理するための実作業として扱う。
- 既存 `task` を v2 の最上位案件として拡張してはならない。
- `project` は複数の `case` をまとめる任意の上位概念として扱う。
- `matter` は v2 初期設計では使用しない。
- `case` の伝達方式は `DIRECT` と `OPEN` を使用する。
- `OPEN` の `case` は、担当希望後に作成者または現在の owner の承認を受けてから担当確定とする。
- `case` の公開範囲は `targetScope` と `requiredRole` で制御する。
- 同じ会社のユーザーであっても、すべての `case` を閲覧できる設計にしてはならない。
- `case` と `task` の状態は分離する。
- 完了承認は下位から上位へ進める。
- コメントと変更履歴は `case` と `task` の両方に持たせる。
- 変更履歴は自動記録し、権限のないユーザーに見せてはならない。
- 案件作成 UI は `REQUEST`、`STANDARD`、`PROJECT` に分ける。
- 案件画面は `自分の案件`、`公開案件`、`組織案件`、`プロジェクト` に分ける。
- DynamoDB の GSI は、組織別、案件別、担当別、公開範囲別、参加会社別の検索パターンを前提に設計する。
- GSI 追加・変更は DynamoDB インフラ変更であるため、実装前に必ずデプロイ影響を確認する。

## 目的

TaskTree v2 は、単なる個人 TODO または社内タスク管理アプリではなく、SI 会社を中心に案件を管理し、複数会社が協業できる業務管理アプリを目標とします。

このドキュメントでは、次の内容を定義します。

- 既存組織構造の維持
- 案件単位の協業モデル
- 依頼会社と協力会社の関係
- 案件、作業、下位作業の階層構造
- 会社間の共有範囲と権限基準
- API、DynamoDB、UI 設計の基準

## 基本組織構造

TaskTree の基本組織構造は、必ず次の形を維持します。

```text
company
  -> division
    -> department
      -> team
        -> user
```

この構造は、会社内部の組織構成と権限フローを表現するための基本モデルです。

各組織エンティティは、可能な限り上位組織 ID をすべて保持します。

- `division` は `companyId` を持つ。
- `department` は `companyId`、`divisionId` を持つ。
- `team` は `companyId`、`divisionId`、`departmentId` を持つ。
- `user` は所属組織 ID を持つ。

この設計は、シングルテーブルで下位組織と構成員を検索しやすくし、権限範囲の計算を単純化するために維持します。

## レコード生成ルール

既存の階層エンティティ生成ルールは維持します。

`pk` はエンティティタイプとします。
固有 ID の属性名も、そのエンティティを表す名前にします。

例:

```text
company:
pk = Company
companyId = {companyId}
sk = Company#{companyId}

team:
pk = Team
teamId = {teamId}
companyId = {companyId}
divisionId = {divisionId}
departmentId = {departmentId}
sk = Department#{departmentId}#Team#{teamId}
```

## 長期目標

TaskTree は、最終的に一社内のタスク管理だけを扱ってはなりません。

次の会社間協業フローを目標とします。

- A 社の社長が会員登録し、自社を作成する。
- A 社が自社の組織を構成する。
- A 社が依頼会社または協力会社のユーザーを招待する。
- 招待された会社は、自社の組織とメンバーを構成できる。
- 複数会社がひとつの案件に参加できる。
- 依頼会社は案件を提示できる。
- 協力会社は案件処理に参加できる。
- 依頼会社側から受託会社を招待する流れも許可する。

## 案件階層

基本階層は次の通りです。

```text
project(optional)
  -> case(required)
    -> child case(optional)
    -> task(required)
      -> subtask(optional)
```

`case` は常に存在する基本案件単位です。
`project` は、長期契約、大規模開発、保守案件など、複数の `case` をまとめる必要がある場合だけ使用します。

`task` は必ず `case` に属します。
`project` が存在する場合でも、`task` は `project` に直接属してはなりません。
`task` は必ず `case` を通じて `project` に接続します。

大きな案件は `child case` に分割し、実行単位は `task` として管理します。
作成者が最初からすべての詳細 `task` を作成する必要はありません。
担当確定後、担当者または担当組織が下位 `case` または `task` を設計できます。

## 案件伝達モデル

`case` は、特定の会社・組織・ユーザーへ直接渡すことも、権限範囲内に公開することもできます。

伝達方式は次の 2 種類です。

```text
DIRECT
OPEN
```

`DIRECT` は、作成者が特定の会社、組織、ユーザーへ `case` を直接提案する方式です。

`OPEN` は、作成者が権限範囲内に `case` を公開し、権限を持つ会社・組織・ユーザーが「担当したい」と申請できる方式です。

`OPEN` の `case` は、担当希望だけでは正式担当になりません。
必ず作成者または現在の owner が承認してから正式担当とします。

承認された会社、組織、ユーザーは、その `case` の owner または assignee になります。
owner または assignee は、必要に応じて下位 `case` または `task` を作成できます。

## 案件作成権限

`case` はすべてのユーザーが作成できます。

ただし、公開範囲と伝達先は、必ず作成者の組織権限の範囲内に制限します。
作成者は、自分より上位の組織または権限外の組織・ユーザーへ `case` を公開または伝達してはなりません。

`case` の公開範囲は、role だけで決定してはなりません。
必ず `targetScope` と `requiredRole` を組み合わせて判定します。

`targetScope` は公開対象の組織範囲です。

- `company`
- `division`
- `department`
- `team`
- `user`

`requiredRole` は、`targetScope` 内で閲覧に必要な最小権限です。

例:

```text
targetScope = company, requiredRole = TEAM_ADMIN
会社全体の team admin に見える。

targetScope = department A, requiredRole = TEAM_ADMIN
department A 配下の team admin にだけ見える。

targetScope = team B, requiredRole = USER
team B の leader と user に見える。
```

`COMPANY_ADMIN` が作成した `case` であっても、常に会社全体へ公開してはなりません。
`COMPANY_ADMIN` は、特定の `division`、`department`、`team`、`user` だけを `targetScope` として指定できます。

## 案件閲覧権限

同じ会社のユーザーがすべての `case` を閲覧できる設計にしてはなりません。

`case` の閲覧権限は、案件ごとの公開範囲と参加状態で判定します。

ユーザーは、次のいずれかを満たす場合に `case` を閲覧できます。

- `case` の作成者である。
- `case` の owner である。
- `case` の assignee である。
- `case` の participant user である。
- `targetScope` 内に所属し、`requiredRole` 以上の権限を持つ。
- participant company に所属し、その会社に付与された公開条件を満たす。

組織階層権限は、基本アクセス範囲を計算するために使用します。
ただし、最終的な閲覧可否は、必ず `case` の公開設定と参加状態を合わせて判定します。

## 担当モデル

担当モデルは、UI が過度に複雑にならない形で設計しなければなりません。

現時点では、次の方針を基本とします。

- `case` は主担当となる owner または owner group を持つ。
- `task` は実作業の担当者を持つ。
- 外部会社は、まず participant company として `case` に参加する。
- 外部会社のユーザーを直接 task assignee にするかは、実装前に別途 UI 複雑度を確認する。

担当モデルの詳細はまだ完全確定ではありません。
実装に入る前に、`case` owner、owner group、task assignee、participant company の責務を必ず確定します。

## 状態管理

`case` と `task` の状態は必ず分離します。

`case status` は次を使用します。

- `WAITING`
- `IN_PROGRESS`
- `REVIEW_REQUESTED`
- `COMPLETED`
- `ON_HOLD`
- `CANCELED`
- `REOPENED`

`case` の基本状態は `WAITING` です。
`OPEN` 公開、`DIRECT` 提案、担当採用待ち、承認待ちは `WAITING` から開始します。

`OPEN` と `DIRECT` は status ではありません。
必ず `deliveryType` として管理します。

`task status` は次を使用します。

- `TODO`
- `IN_PROGRESS`
- `REVIEW_REQUESTED`
- `DONE`
- `ON_HOLD`
- `CANCELED`

完了承認は、必ず下位から上位へ進めます。

例:

1. user が request または task を処理する。
2. その request または task を作成した team leader が確認して承認する。
3. team leader は、自分が担当した standard case が完了したと判断したら承認依頼を送る。
4. department owner は standard case を確認して承認する。
5. 上位 project または最上位 case がある場合、最初の作成者が最終承認する。
6. 外部依頼者が存在する場合、最終完了は依頼者が承認する。

承認拒否は許可します。
承認者が拒否する場合、`rejectReason` を必須で残し、状態を `REOPENED` に変更します。
`REOPENED` の `case` または `task` は、前の担当者へ戻します。

## コメントと変更履歴

コメントは `case` と `task` の両方に持たせます。

`case` コメントは、案件全体の議論に使用します。
例: 要件確認、担当調整、承認依頼、外部会社との相談。

`task` コメントは、特定作業の実装、確認、修正の議論に使用します。
例: エラー原因、修正内容、確認結果、作業中の質問。

変更履歴は必ず自動記録します。

`case history` には、少なくとも次を記録します。

- 作成
- タイトル変更
- 説明変更
- 状態変更
- `deliveryType` 変更
- `targetScope` 変更
- `requiredRole` 変更
- 担当確定
- 担当変更
- claim request
- 承認依頼
- 承認
- 承認拒否
- 保留
- 取消

`task history` には、少なくとも次を記録します。

- 作成
- タイトル変更
- 説明変更
- 状態変更
- 担当者変更
- 期限変更
- 承認依頼
- 完了承認
- 保留
- 取消

`case` 詳細画面には `History` タブを必ず置きます。

履歴一覧は、まず日時と要約だけを表示します。
ユーザーが履歴項目をクリックした場合に、詳細変更内容を表示します。

表示例:

```text
2026/05/20 15:34:56 > 状態変更
2026/05/20 15:40:12 > 担当変更
2026/05/20 16:02:03 > 承認拒否
```

詳細では、変更者、変更前、変更後、変更理由、`rejectReason` を確認できるようにします。

外部会社ユーザーは、権限を持つ `case` と `task` のコメント・履歴だけを閲覧できます。
権限のない `case`、`task`、組織情報、変更履歴を見せてはなりません。

## 既存 task との関係

既存 `task` は、v2 の最上位案件として維持してはなりません。

v2 では、`case` を案件単位、`task` を `case` 配下の実作業単位として再定義します。

```text
既存:
task = 案件のように使用

v2:
case = 解決すべき依頼、問題、業務単位
task = case を処理するための実作業単位
```

既存 `task` エンティティ、API、UI は、新しい `case / task` 構造へ段階的に置き換えます。

v2 初期段階では、既存運用データのマイグレーションは考慮しません。
このプロジェクトはポートフォリオ目的であり、現時点では実運用データ保全が必須条件ではないためです。

ただし、既存コードの実装パターン、テスト構造、権限検証方式は、再利用可能な範囲で参考にします。

## DynamoDB シングルテーブル設計

基本 record ルールは既存組織エンティティ規則を維持します。

v2 の GSI は、次の検索パターンを基準に設計します。

### byCompany

会社基準で組織、`case`、participant、assignment を検索します。

```text
partition key: companyId
sort key: companySortKey
```

例:

```text
companySortKey = Team#{teamId}
companySortKey = Case#{status}#{updatedAt}#{caseId}
companySortKey = ParticipantCompany#{caseId}
```

### byDivision

division 基準で department、team、user、`case` を検索します。

```text
partition key: divisionId
sort key: divisionSortKey
```

### byDepartment

department 基準で team、user、`case` を検索します。

```text
partition key: departmentId
sort key: departmentSortKey
```

### byTeam

team 基準で user、`case`、`task` を検索します。

```text
partition key: teamId
sort key: teamSortKey
```

### byCase

`case` 詳細画面で、下位 `case`、`task`、comment、history、claim request を検索します。

```text
partition key: caseId
sort key: caseSortKey
```

例:

```text
caseSortKey = ChildCase#{status}#{updatedAt}#{childCaseId}
caseSortKey = Task#{status}#{updatedAt}#{taskId}
caseSortKey = Comment#{createdAt}#{commentId}
caseSortKey = History#{createdAt}#{historyId}
caseSortKey = ClaimRequest#{status}#{createdAt}#{claimRequestId}
```

### byAssignee

会社、部署、チーム、ユーザー基準で、担当中の `case` または `task` を検索します。

複数担当を許可する場合、`case/task` 本体に配列だけを持たせて検索してはなりません。
担当ごとに assignment record を作成します。

```text
partition key: assigneeKey
sort key: assigneeSortKey
```

例:

```text
assigneeKey = Company#{companyId}
assigneeKey = Department#{departmentId}
assigneeKey = Team#{teamId}
assigneeKey = User#{userId}
assigneeSortKey = Case#{status}#{dueDate}#{caseId}
assigneeSortKey = Task#{status}#{dueDate}#{taskId}
```

### byVisibility

`OPEN` の `case` を `targetScope` と `requiredRole` 基準で検索します。

`OPEN` の `case` は、`case` 本体だけで検索してはなりません。
公開範囲ごとに visibility record を作成します。

```text
partition key: visibilityKey
sort key: visibilitySortKey
```

例:

```text
visibilityKey = Company#{companyId}
visibilityKey = Division#{divisionId}
visibilityKey = Department#{departmentId}
visibilityKey = Team#{teamId}
visibilitySortKey = Role#{requiredRoleRank}#Case#{status}#{updatedAt}#{caseId}
```

ユーザーは、自分の company、division、department、team の `visibilityKey` を基準に検索します。
role rank 比較が DynamoDB query だけで複雑になる場合は、許可可能な role rank ごとに複数回 query します。

### byParticipantCompany

外部会社または協力会社が参加中の `case` を検索します。

```text
partition key: participantCompanyId
sort key: participantCompanySortKey
```

例:

```text
participantCompanySortKey = Case#{status}#{updatedAt}#{caseId}
participantCompanySortKey = Project#{status}#{updatedAt}#{projectId}
```

### GSI 設計原則

- 組織構造検索は `byCompany`、`byDivision`、`byDepartment`、`byTeam` を使用する。
- `case` 詳細画面は `byCase` を使用する。
- 自分が担当する仕事は `byAssignee` を使用する。
- `OPEN` 公開案件一覧は `byVisibility` を使用する。
- 外部会社参加案件は `byParticipantCompany` を使用する。
- 複数担当、複数公開範囲、複数参加会社は、配列検索ではなく edge record で検索する。

GSI 追加と変更は DynamoDB インフラ変更です。
実装前に、CDK 変更影響、既存データ影響、デプロイ順序を必ず確認します。

## UI 方針

案件一覧をひとつの巨大画面にしてはなりません。

用途に応じて、次の 4 画面に分けます。

```text
自分の案件
公開案件
組織案件
プロジェクト
```

### 自分の案件

ユーザーが最初に見るメイン画面です。
自分が処理すべき `case`、`task`、承認依頼を中心に表示します。

含める対象:

- 自分が owner の `case`
- 自分が assignee の `task`
- 自分の team または department が担当する `case`
- 自分が承認すべき `case` または `task`
- 自分が依頼した `case`

推奨タブ:

- やること
- 承認待ち
- 依頼した案件
- 完了

### 公開案件

`OPEN` として公開された `case` を見る画面です。
権限上閲覧可能で、担当希望を出せる `case` を表示します。

推奨タブ:

- 全体
- 自部署
- 自チーム
- 申請可能
- 申請中

### 組織案件

管理者用画面です。
社長、部長、チームリーダーが、下位組織の `case` 進行状況を確認するために使用します。

フィルター:

- company
- division
- department
- team
- user
- status
- caseType

組織案件画面は、ボードよりも階層フィルターとリストを優先します。

### プロジェクト

`PROJECT` タイプまたは `project` に接続された `case` を見る画面です。
大きな業務、長期業務、外部依頼プロジェクトを管理します。

project 詳細では、次の構造を見られるようにします。

```text
project
  -> case
    -> child case
      -> task
```

### 表示方式

基本表示はリストとします。
ボードは、状態の流れを見るための補助画面として提供します。

基本リスト列:

- 案件名
- 種類
- 状態
- 公開範囲
- 担当組織
- 依頼者
- 期限
- 承認状態

ボード列:

- `WAITING`
- `IN_PROGRESS`
- `REVIEW_REQUESTED`
- `COMPLETED`

### 案件作成 UI

案件作成ボタンを押した場合、最初に作成モードを選択します。

```text
REQUEST
STANDARD
PROJECT
```

`REQUEST` は、チームリーダーが自チームの社員へ素早く案件を提示するためのモードです。
小さな不具合、確認依頼、短い作業指示に使います。

`STANDARD` は、部署がチームへ大きな枠の案件を開始するためのモードです。
担当チームは、必要に応じて `REQUEST` または下位 `case` に分解できます。

`PROJECT` は、依頼者、社長、部署単位のユーザーが、全体プロジェクトまたは長期業務を作成するためのモードです。

外部会社は内部組織ツリーに混ぜてはなりません。
`case` 詳細画面の参加会社エリアに分けて表示します。

`case` 詳細画面は、次の情報を表示します。

- タイトル
- 状態
- 種類
- 主要アクション
- 説明
- 下位 `case`
- `task` 一覧
- コメント
- History
- 担当組織
- 公開範囲
- 参加会社
- 期限
- 承認情報

実装後は `yarn dev` で画面を起動し、実際の使用フローを確認してから修正点を判断します。

## 保留事項

次の内容は、実装前に必ず再確認します。

- 会社間 participant role の正式名称
- owner と assignee の正確な責務分担
- 外部会社ユーザーを直接 task assignee にする UI の扱い
- claim request と approval の詳細 status
- DynamoDB GSI の実装名と既存 GSI からの移行方法

## 実装前確認事項

このモデルに関わる実装を始める前に、必ず次を確認します。

- パッケージ境界を越える変更か。
- API 契約が変わるか。
- DynamoDB record 構造が変わるか。
- GSI または IAM 変更が必要か。
- 既存 task 機能との互換性が必要か。
- マイグレーションが必要か。
- 必要な type-check、lint、test は何か。
