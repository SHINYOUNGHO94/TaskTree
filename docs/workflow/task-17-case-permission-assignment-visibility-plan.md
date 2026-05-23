# Task 17 Case 権限・割当 record 正式化計画

このドキュメントは、TaskTree v2 Case 開発における Task 17 の実装範囲を定義します。

TaskTree v2 Case 作業は、次の文書に必ず従います。

- `docs/core/case-collaboration-model.md`
- `docs/core/operational-quality-baseline.md`

過去の実務運用経験は、一般化された engineering principle としてのみ参考にします。
勤務先プロジェクトの固有 code、data、comment、業務固有実装をコピーしてはなりません。

## 現在の完了状態

Task 16 までで、次の flow を作りました。

- root `REQUEST` / `STANDARD` / `PROJECT` case 作成
- `PROJECT -> STANDARD -> REQUEST` hierarchy 表示
- `OPEN` case への participant company 招待
- participant company の accept / reject
- `ACTIVE` participant company の case detail 読み取り
- `byParticipantCompany` GSI による invitation list
- case detail / history / comments / tasks の基本的な participant access

Task 17 では、Task 16 までに増えた権限判定を正式化します。

## Task 17 の目的

Task 17 の目的は、Case の閲覧・割当・公開範囲を、将来の運用に耐える形へ整理することです。

現在は `CaseRecord` 本体に `assigneeKey` と `visibilityKey` を持たせています。
これは初期実装としては有効ですが、今後 `owner`、`assignee`、`target scope`、`participant company`、`role` が増えると、権限判定が handler ごとに重複しやすくなります。

Task 17 では、次を正式化します。

- Case read permission の共通判定
- Assignment record
- Visibility record
- `GET /cases` の公開範囲検索
- mutation 時の access record 同期

## Target Flow

```text
case is created or updated
  -> Case record is saved
  -> Assignment record is saved
  -> Visibility record is saved
  -> list APIs query assignment / visibility records
  -> detail APIs use shared permission guard
```

## Scope

Task 17 で実装するもの:

- API 側に Case permission helper / service を追加する。
- `CaseAssignmentRecord` を追加する。
- `CaseVisibilityRecord` を追加する。
- `byAssignee` / `byVisibility` は既存 GSI を再利用する。
- `GET /cases` の検索対象を `COMPANY` / `DIVISION` / `DEPARTMENT` / `TEAM` / `USER` に広げる。
- `requiredRole` を必ず permission 判定に含める。
- case detail / history / comments / tasks / participant companies の read guard を共通化する。
- case create / child create / status update / claim approval など、Case を変更する mutation で access records を同期する。
- owner / target scope / status / dueDate が変わった場合、古い assignment / visibility record を残さない。
- API tests を追加・更新する。
- README を成果単位で更新する。

Task 17 は、ユーザーが見える新機能よりも、権限と検索基盤の正式化を優先します。

## Out Of Scope

Task 17 では実装しないもの:

- 外部会社 user を task assignee にする flow
- 複数 user / 複数 team の同時 assignment UI
- email notification
- full-text search
- OpenAPI / generated client
- E2E test
- large data migration job
- 新しい DynamoDB table

これらは Task 18 以降で扱います。

## Permission Model

Case permission は、次の層で判定します。

1. Cognito identity がある。
2. server 側 user profile がある。
3. tenant boundary を通過する。
4. Case permission を通過する。
5. mutation の場合は mutation authority を通過する。

`same company` だけで許可してはいけません。

### Internal Read

同じ owner company 内の user は、次のいずれかで read できます。

- case creator
- current owner
- assignment record に該当する
- `targetScope` に該当する
- `requiredRole` を満たす

`targetScope` は必ず次をすべて扱います。

- `COMPANY`
- `DIVISION`
- `DEPARTMENT`
- `TEAM`
- `USER`

### External Participant Read

外部 participant company user は、次の場合だけ read できます。

- case `deliveryType` が `OPEN`
- participant company record が存在する
- participant company record の status が `ACTIVE`
- caller の `companyId` が participant company の `companyId` と一致する

`INVITED` / `REJECTED` / `REMOVED` は detail、history、comments、tasks、participant companies を読めません。

### Mutation Authority

mutation は read より強い条件を必要とします。

Task 17 では、次を最低限守ります。

- owner-only mutation は creator または current owner のみ許可する。
- participant company は Task 17 では原則 read-only のままにする。
- claim approval による owner 変更では assignment record も更新する。
- status / dueDate 更新では assignment / visibility sort key も更新する。

## Data Model

### CaseAssignmentRecord

`byAssignee` GSI で検索するための正式 record です。

```text
pk = "CaseAssignment"
sk = "Case#{caseId}#Assignment#{assigneeKey}"

caseId
ownerCompanyId
assigneeKey
assigneeType
assigneeId
assignmentRole
assignmentStatus
assigneeSortKey
createdAt
updatedAt
```

`assigneeKey` の例:

```text
Company#{companyId}
Division#{divisionId}
Department#{departmentId}
Team#{teamId}
User#{userId}
```

`assigneeSortKey` の例:

```text
Case#{status}#{dueDateOrNONE}#{caseId}
```

Task 17 では、まず current owner を assignment record として扱います。
複数 assignee UI は Task 17 では作りません。

### CaseVisibilityRecord

`byVisibility` GSI で検索するための正式 record です。

```text
pk = "CaseVisibility"
sk = "Case#{caseId}#Visibility#{visibilityKey}"

caseId
ownerCompanyId
visibilityKey
visibilitySortKey
targetScope
targetScopeId
requiredRole
requiredRoleRank
deliveryType
status
createdAt
updatedAt
```

`visibilityKey` の例:

```text
Company#{companyId}
Division#{divisionId}
Department#{departmentId}
Team#{teamId}
User#{userId}
```

`visibilitySortKey` の例:

```text
Role#{requiredRoleRank}#Case#{status}#{updatedAt}#{caseId}
```

### Compatibility

Task 17 では、既存 `CaseRecord` の `assigneeKey` / `visibilityKey` をすぐに削除しません。

理由:

- 既存 data migration を Task 17 に含めないため。
- rollback 時の影響を抑えるため。
- 既存 repository / tests の破壊範囲を小さくするため。

ただし、新しい list / permission logic は正式 record を優先して使います。

## DynamoDB Access Pattern

Task 17 では、原則として新しい GSI を追加しません。

再利用する既存 GSI:

- `byAssignee`
- `byVisibility`
- `byParticipantCompany`
- `byCase`

### My Assigned Cases

```text
IndexName = byAssignee
assigneeKey = User#{userId}
```

必要に応じて、owner type に合わせて `Team#...`、`Department#...`、`Division#...`、`Company#...` も使います。

### Visible Cases

caller profile から次の visibility keys を作ります。

```text
Company#{companyId}
Division#{divisionId}
Department#{departmentId}
Team#{teamId}
User#{userId}
```

`NONE` の組織 ID は query しません。

query 後に必ず server 側で次を filter します。

- owner company boundary
- `requiredRole`
- case status
- duplicate case

### External Participant Cases

外部参加中の case は、Task 16 の `byParticipantCompany` を使います。

`GET /cases` に含めるか、既存 invitation section に残すかは、既存 UI への影響を見て決めます。
どちらの場合も `ACTIVE` participant だけ detail link を有効にします。

## Repository / Service 方針

### Access Record Builder

Case から assignment / visibility record を作る helper を追加します。

候補:

```text
packages/task-api/src/aws/entities/items/caseAssignmentRecord.ts
packages/task-api/src/aws/entities/items/caseVisibilityRecord.ts
packages/task-api/src/repositories/caseAssignmentRepository.ts
packages/task-api/src/repositories/caseVisibilityRepository.ts
packages/task-api/src/services/caseAccessRecordBuilder.ts
packages/task-api/src/services/casePermissionService.ts
```

### CasePermissionService

handler ごとに同じ権限判定を書かないようにします。

最低限の operation:

```text
READ_DETAIL
READ_HISTORY
READ_COMMENTS
READ_TASKS
READ_PARTICIPANTS
MUTATE_OWNER_ONLY
MUTATE_STATUS
MUTATE_COMMENT
MUTATE_TASK
```

Task 17 では、既存 handler の挙動を壊さず、read 系 guard を優先して共通化します。

### Transaction

Case 本体と access records を同時に更新する mutation では、可能な限り `TransactWriteCommand` を使います。

対象候補:

- `createCase`
- `createChildCase`
- `updateCase`
- `updateCaseStatus`
- `updateCaseClaimRequest`

既存 transaction と衝突する場合は、先に設計を分けて報告してください。

## API 影響

原則として新規 route は追加しません。

変更対象候補:

- `GET /cases`
- `GET /cases/{id}`
- `GET /cases/{id}/history`
- `GET /cases/{id}/comments`
- `GET /cases/{id}/tasks`
- `GET /cases/{id}/participant-companies`
- Case mutation handlers

API response shape は原則変更しません。
response shape を変える必要がある場合は、実装前に理由を報告してください。

## UI 影響

Task 17 では大きな UI 改修をしません。

最低限確認するもの:

- Dashboard case list が権限どおり表示される。
- 権限のない case detail は既存 error state を表示する。
- `INVITED` participant には detail link を出さない、または押せない状態にする。
- loading / empty / error state を壊さない。

## Test Scope

必須 API tests:

- same-company creator read allowed
- same-company owner read allowed
- `COMPANY` target scope read allowed
- `DIVISION` target scope read allowed
- `DEPARTMENT` target scope read allowed
- `TEAM` target scope read allowed
- `USER` target scope read allowed
- insufficient role denied
- same company but out-of-scope denied
- cross-company without participant denied
- `ACTIVE` participant read allowed for `OPEN`
- `ACTIVE` participant denied for `DIRECT`
- `INVITED` participant denied
- `REJECTED` participant denied
- `REMOVED` participant denied
- `GET /cases` deduplicates assignment / visibility results
- owner change updates assignment record
- target scope change updates visibility record
- stale assignment / visibility record is not left active

可能なら追加する tests:

- `byAssignee` query uses assignment record
- `byVisibility` query uses visibility record
- mutation uses transaction or equivalent consistency guard

## Verification

Claude は完了後、少なくとも次を実行してください。

```powershell
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
yarn.cmd workspace @task/infra cdk synth
yarn.cmd test:api
```

Codex が軽量 review だけを行う場合、ユーザーの明示指示がない限り全体 test は実行しません。

## Deployment Impact

Task 17 で新 GSI は原則追加しません。

ただし、次は deployment 影響があります。

- Lambda code update
- IAM permission update
- transaction write を使う Lambda への `dynamodb:TransactWriteItems`
- stale record delete を行う Lambda への `dynamodb:DeleteItem`

新 GSI が必要だと判断した場合は、実装前に必ず報告してください。

## 禁止事項

- `same company` だけで read / mutation を許可しない。
- `Scan` で case list を作らない。
- client から送られた `companyId`、`ownerId`、`role` を信頼しない。
- permission check を handler ごとに増殖させない。
- participant company を internal org tree に混ぜない。
- 外部会社 user を Task 17 で task assignee にしない。
- unrelated refactor をしない。
- `repomix-output.xml` を編集しない。
- 勤務先プロジェクトの固有情報を code / docs / comments に入れない。

## 完了条件

Task 17 は、次を満たしたら完了扱いにできます。

- assignment record / visibility record が追加されている。
- `GET /cases` が formalized record と permission rule に基づいて動く。
- detail 系 read guard が共通 permission service に寄せられている。
- `COMPANY` / `DIVISION` / `DEPARTMENT` / `TEAM` / `USER` scope が全て扱われている。
- `requiredRole` が list / detail の両方で考慮されている。
- participant company の `OPEN` / `ACTIVE` 制約が維持されている。
- stale assignment / visibility record が残らない。
- API tests が追加されている。
- deployment 影響が報告されている。
- README が成果単位で更新されている。

## Claude への実装指示

```text
TaskTree v2 の Task 17 を実装してください。

作業前に必ず以下を読んでください。

- AGENTS.md
- CLAUDE.md
- docs/core/product-goal-v2.md
- docs/core/ai-coding-principles.md
- docs/core/current-architecture.md
- docs/core/package-boundaries.md
- docs/core/coding-rules.md
- docs/core/operational-quality-baseline.md
- docs/core/case-collaboration-model.md
- docs/workflow/ai-team-workflow.md
- docs/workflow/v2-case-development-roadmap.md
- docs/workflow/task-17-case-permission-assignment-visibility-plan.md

今回の目的は、Case の権限判定、割当 record、公開範囲 record を正式化することです。

実装範囲は `docs/workflow/task-17-case-permission-assignment-visibility-plan.md` を基準にしてください。

必須要件:

1. Case read permission を共通 helper / service に寄せてください。
2. `CaseAssignmentRecord` を追加してください。
3. `CaseVisibilityRecord` を追加してください。
4. 既存 `byAssignee` / `byVisibility` GSI を再利用してください。
5. 新 GSI が必要だと判断した場合は、実装前に理由と deployment 影響を報告してください。
6. `GET /cases` は `COMPANY` / `DIVISION` / `DEPARTMENT` / `TEAM` / `USER` visibility を扱ってください。
7. `requiredRole` を list / detail permission の両方で必ず検査してください。
8. `same company` だけで許可しないでください。
9. 外部 participant company は `OPEN` かつ `ACTIVE` の場合だけ detail / history / comments / tasks / participant companies を読めるようにしてください。
10. `DIRECT` case は participant record があっても外部会社に読ませないでください。
11. case create / child create / status update / claim approval など Case を変更する mutation で assignment / visibility record を同期してください。
12. owner / target scope / status / dueDate が変わった場合、古い assignment / visibility record を active に残さないでください。
13. 可能な限り transaction write を使い、必要な IAM を追加してください。
14. UI は大改修せず、Dashboard case list と detail error state が壊れない範囲にしてください。
15. `INVITED` participant の detail link は表示しない、または押せない状態にしてください。

注意:

- `repomix-output.xml` は分析用です。直接編集しないでください。
- 変更前に必ず原本ファイルを読んでください。
- unrelated refactor はしないでください。
- client が送った `companyId`、`ownerId`、`role` は信頼しないでください。
- `Scan` を使わないでください。
- participant company を internal org tree に混ぜないでください。
- 外部会社 user を Task 17 で task assignee にしないでください。
- any / eslint-disable / 不要な韓国語コメントは入れないでください。

完了後に必ず以下を実行してください。

- yarn.cmd type-check:core
- yarn.cmd type-check:api
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build
- yarn.cmd workspace @task/infra build
- yarn.cmd workspace @task/infra cdk synth
- yarn.cmd test:api

最後に報告してください。

報告には以下を含めてください。

- 変更したファイル一覧
- 実装した permission / assignment / visibility flow
- 権限検査の内容
- DynamoDB access pattern と GSI 影響
- IAM / Lambda / API Gateway / DynamoDB の deployment 影響
- 実行した検証 command と結果
- Task 17 で意図的に未対応にしたこと
```
