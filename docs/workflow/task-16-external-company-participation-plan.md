# Task 16 外部会社参加フロー計画

このドキュメントは、TaskTree v2 Case 開発における Task 16 の実装範囲を定義します。

TaskTree v2 Case 作業は、次の文書に必ず従います。

- `docs/core/case-collaboration-model.md`
- `docs/core/operational-quality-baseline.md`

過去の実務運用経験は、一般化された engineering principle としてのみ参考にします。
勤務先プロジェクトの固有 code、data、comment、業務固有実装をコピーしてはなりません。

## 現在の完了状態

Task 15 までで、次を確認できる入口を作りました。

- root `REQUEST` / `STANDARD` / `PROJECT` case 作成
- `PROJECT -> STANDARD -> REQUEST` hierarchy 表示
- `PROJECT` から `STANDARD` child 作成
- `STANDARD` から `REQUEST` child 作成
- case detail で task / history / comment / claim request / child case を表示
- claim approval transaction 用 IAM 修正

## Task 16 の目的

Task 16 では、`OPEN` case を社外協業へ広げる最初の flow を追加します。

この task の目的は、外部会社を内部組織 tree に混ぜず、`case` 単位の participant company として扱うことです。

Target flow:

```text
owner company creates OPEN case
  -> owner invites external company
    -> invited company accepts participation
      -> active participant company can read allowed case detail
      -> participant company appears in case detail
```

## Scope

Task 16 で実装するもの:

- participant company record model を追加する。
- `byParticipantCompany` GSI を追加する。
- `OPEN` case に外部会社を招待する API を追加する。
- 招待された会社が invitation を一覧できる API を追加する。
- 招待された会社が invitation を accept / reject できる API を追加する。
- case detail で participant company 一覧を表示する。
- active participant company の user が、許可された範囲で case detail を読めるようにする。
- API tests を追加する。
- README を成果単位で更新する。

Task 16 では最低限の社外参加 flow に絞ります。
外部会社ユーザーを task assignee にすることはしません。

## Out Of Scope

Task 16 では実装しないもの:

- email invitation
- company name search UI
- global public marketplace
- external company user の直接 task assignment
- external company 用の細かい role matrix 完成
- assignment record の正式化
- visibility record の全面再設計
- participant company の project-level 集計
- external company が child case / task / status を作成・更新する flow
- OpenAPI / generated client 導入

これらは Task 17 以降で扱います。

## Data Model

### CaseParticipantCompany

`@task/core` に participant company type を追加します。

```ts
export enum CaseParticipantCompanyStatus {
  INVITED = "INVITED",
  ACTIVE = "ACTIVE",
  REJECTED = "REJECTED",
  REMOVED = "REMOVED",
}

export interface CaseParticipantCompany {
  participantCompanyId: string;
  caseId: string;
  ownerCompanyId: string;
  companyId: string;
  companyName: string | null;
  status: CaseParticipantCompanyStatus;
  invitedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

`participantCompanyId` は record id です。
`companyId` は参加する外部会社の company id です。
`ownerCompanyId` は case を所有する会社です。

### DynamoDB Record

新しい record は既存 single table に保存します。

```text
pk                         = "CaseParticipantCompany"
sk                         = "Case#{caseId}#ParticipantCompany#{companyId}"
caseId                     = caseId
caseSortKey                = "ParticipantCompany#{status}#{createdAt}#{companyId}"
participantCompanyId       = participantCompanyId
participantCompanySortKey  = "Case#{status}#{updatedAt}#{caseId}"
ownerCompanyId             = ownerCompanyId
companyId                  = participant company id
```

## DynamoDB Access Pattern

Task 16 では `byParticipantCompany` GSI を追加します。

```text
indexName: byParticipantCompany
partitionKey: participantCompanyId
sortKey: participantCompanySortKey
```

注意:

- これは infrastructure change です。
- CDK deploy が必要です。
- 既存 table に GSI を追加するため、デプロイ影響を実装報告で明示します。
- `Scan` で invitation list を実装してはなりません。

## API Contract

### POST /cases/{id}/participant-companies

`OPEN` case の creator または current USER owner が、外部会社を招待します。

Request:

```json
{
  "companyId": "string"
}
```

Rules:

- Cognito user が必要。
- caller profile を server 側で取得する。
- case が存在する。
- case owner company と caller company が一致する。
- caller は case creator または current USER owner。
- case は `deliveryType = OPEN`。
- target company が存在する。
- target company は owner company と異なる。
- 同じ case / company の active or invited record が既にある場合は `400`。
- client supplied owner fields は受け取らない。

Response `201`:

```json
{ "participantCompanyId": "string" }
```

History:

```text
PARTICIPANT_COMPANY_INVITED
```

### GET /cases/{id}/participant-companies

case detail 用に participant company 一覧を返します。

Allowed:

- case creator
- current USER owner
- active participant company に所属する user

Invited but not active の company user には、case detail ではなく invitation list API を使わせます。

Response `200`:

```json
[
  {
    "participantCompanyId": "string",
    "caseId": "string",
    "ownerCompanyId": "string",
    "companyId": "string",
    "companyName": "string | null",
    "status": "INVITED | ACTIVE | REJECTED | REMOVED",
    "invitedBy": "string",
    "reviewedBy": "string | null",
    "reviewedAt": "string | null",
    "createdAt": "string",
    "updatedAt": "string"
  }
]
```

### GET /cases/participant-company-invitations

caller の company に届いた external case invitation を一覧します。

Rules:

- caller profile が必要。
- `byParticipantCompany` を使用する。
- caller company id を partition key に使う。
- `INVITED` と `ACTIVE` を返す。
- `REJECTED` / `REMOVED` は default では返さない。

Response `200`:

```json
[
  {
    "participantCompany": { "...": "..." },
    "caseSummary": { "...": "..." }
  }
]
```

`caseSummary` は最小限にします。
`INVITED` 状態では comment / history / task / child case を返してはなりません。

### PUT /cases/{id}/participant-companies/{participantCompanyId}

invited company の admin が invitation を accept / reject します。

Request:

```json
{
  "status": "ACTIVE | REJECTED"
}
```

Rules:

- caller は invited company に所属する。
- caller role は `COMPANY_ADMIN` または `DIVISION_ADMIN` 以上に制限する。
- participant record は `INVITED` でなければならない。
- owner company user がこの route で勝手に accept してはならない。
- `ACTIVE` になった後、participant company user は許可された case detail を読める。

History:

```text
PARTICIPANT_COMPANY_ACCEPTED
PARTICIPANT_COMPANY_REJECTED
```

## Authorization Policy

Task 16 で追加する認可は、次の層で確認します。

1. Cognito identity
2. server-side user profile
3. owner company boundary
4. participant company boundary
5. case permission
6. mutation authority

active participant company user に許可するもの:

- `GET /cases/{id}`
- `GET /cases/{id}/participant-companies`
- `GET /cases/{id}/comments`
- `GET /cases/{id}/history`
- `GET /cases/{id}/tasks`

Task 16 で許可しないもの:

- case status update
- child case creation
- case task creation
- claim approval
- participant company invitation
- owner change

comment 作成を外部会社に許可するかは、実装前に UI / security の複雑度を確認します。
迷う場合、Task 16 では read-only にしてください。

## Frontend Scope

### Case Detail

case detail に participant company section を追加します。

owner side:

- participant company list
- invite form
- status badge
- loading / empty / error state

participant side:

- 自社が active participant であることを表示
- owner company の内部組織情報を過剰に見せない

### Invitation List

Dashboard に external invitation / participation section を追加します。

表示:

- invited case summary
- owner company name if available
- status
- accept / reject button

必須 UI state:

- loading
- empty
- error
- partial-error

## Tests

API tests:

- owner can invite external company to OPEN case
- owner cannot invite external company to DIRECT case
- non-owner cannot invite
- owner cannot invite own company
- nonexistent target company returns 404
- duplicate invitation returns 400
- invited company admin can accept
- invited company non-admin cannot accept
- other company cannot accept
- active participant company can read case detail
- invited but not active company cannot read case detail
- participant company cannot update status or create child case
- cross-company user without participant record cannot read case detail

Repository / record tests:

- participant company record key structure
- byCase query for case detail section
- byParticipantCompany query for invitation list

Infra tests or synth verification:

- `byParticipantCompany` GSI exists
- Lambda IAM has only required `GetItem` / `Query` / `PutItem` / `TransactWriteItems` where needed

## Verification Commands

実装後に最低限実行します。

```text
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
yarn.cmd workspace @task/infra cdk synth
yarn.cmd test:api
```

UI runtime 確認が可能なら、次も確認します。

- owner company で OPEN case を作る
- owner company で external company を invite する
- invited company で invitation を見る
- invited company で accept する
- accepted company で case detail を開く
- unauthorized company で case detail が開けない

## Deployment Impact

Task 16 は infrastructure change を含みます。

Expected:

- new Lambda: yes
- new API route: yes
- new DynamoDB table: no
- new DynamoDB GSI: yes, `byParticipantCompany`
- IAM permission change: yes
- deployment required: yes

実装報告では、この deployment impact を必ず明記してください。

## README 更新

README には細かい作業ログではなく、Task 16 の成果を簡潔に追記します。

含める内容:

- external company invitation
- participant company list
- invitation accept / reject
- active participant read access
- GSI / IAM / deploy impact
- 実行した verification

## Claude への実装指示

以下をそのまま Claude に渡せます。

```text
TaskTree v2 の Task 16 を実装してください。

作業前に必ず次を読んでください。

- AGENTS.md
- CLAUDE.md
- docs/core/product-goal-v2.md
- docs/core/ai-coding-principles.md
- docs/core/current-architecture.md
- docs/core/package-boundaries.md
- docs/core/coding-rules.md
- docs/core/case-collaboration-model.md
- docs/core/operational-quality-baseline.md
- docs/workflow/ai-team-workflow.md
- docs/workflow/v2-case-development-roadmap.md
- docs/workflow/task-16-external-company-participation-plan.md
- repomix-output.xml

repomix-output.xml は分析専用です。直接編集しないでください。
実装前に必ず対象の原本ファイルを読み直してください。

目的:

OPEN case に外部会社を participant company として招待し、招待された会社が accept / reject できる最初の社外協業 flow を作ってください。

実装範囲:

1. core type を追加してください。
   - CaseParticipantCompanyStatus
   - CaseParticipantCompany
   - invitation list response に必要な型

2. DynamoDB record / repository を追加してください。
   - CaseParticipantCompanyRecord
   - CaseParticipantCompanyRepository
   - caseId + caseSortKey で case detail の participant list を取得
   - byParticipantCompany で invited / active case を取得

3. infra を更新してください。
   - TaskEntities に byParticipantCompany GSI を追加
   - 必要な Lambda と route を追加
   - IAM は最小権限にしてください
   - deployment impact を報告してください

4. API を追加してください。
   - POST /cases/{id}/participant-companies
   - GET /cases/{id}/participant-companies
   - GET /cases/participant-company-invitations
   - PUT /cases/{id}/participant-companies/{participantCompanyId}

5. 既存 case detail 系 API の read permission を拡張してください。
   - ACTIVE participant company user は許可された case detail を読める
   - INVITED のみでは detail / history / comments / tasks を読めない
   - unrelated company user は読めない

6. UI を追加してください。
   - case detail に participant company section
   - owner side invite form
   - invited company 用 invitation / participation section
   - loading / empty / error / partial-error state

7. tests を追加してください。
   - invite success
   - DIRECT case invite denied
   - non-owner denied
   - own company invite denied
   - duplicate invite denied
   - accept / reject permission
   - active participant read allowed
   - invited-only read denied
   - unrelated company read denied
   - participant cannot mutate owner-only actions

禁止:

- 勤務先プロジェクトの固有 code / data / comment をコピーしない
- external company を内部 org tree に混ぜない
- Scan で invitation list を作らない
- same company だけで安易に許可しない
- participant company user に owner-only mutation を許可しない
- external company user を task assignee にしない
- unrelated refactor をしない
- repomix-output.xml を編集しない

検証:

- yarn.cmd type-check:core
- yarn.cmd type-check:api
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build
- yarn.cmd workspace @task/infra build
- yarn.cmd workspace @task/infra cdk synth
- yarn.cmd test:api

最後の報告には必ず次を含めてください。

- 変更ファイル
- 実装内容
- 権限 / tenant 分離の確認
- DynamoDB access pattern / GSI 影響
- IAM / deployment 影響
- UI error state
- 実行した検証
- 未実施の確認があれば理由
```
