# Task 18 Case 検索・UI 導線・E2E 安定化計画

このドキュメントは、TaskTree v2 Case 開発における Task 18 の実装範囲を定義します。

TaskTree v2 Case 作業は、次の文書に必ず従います。

- `docs/core/case-collaboration-model.md`
- `docs/core/operational-quality-baseline.md`

過去の実務運用経験は、一般化された engineering principle としてのみ参考にします。
勤務先プロジェクトの固有 code、data、comment、業務固有実装をコピーしてはなりません。

## 現在の完了状態

Task 17 までで、次を実装しました。

- root `REQUEST` / `STANDARD` / `PROJECT` case 作成
- `PROJECT -> STANDARD -> REQUEST` hierarchy
- task / history / comments / claim request
- `OPEN` case の participant company 招待 / accept / reject
- `ACTIVE` participant company の読み取り
- Case permission service
- `CaseAssignmentRecord`
- `CaseVisibilityRecord`
- assignment / visibility record を使った `GET /cases`
- Case mutation と access record の transaction 同期

Task 18 は、v2 Case roadmap の最終仕上げです。

## Task 18 の目的

Task 18 の目的は、TaskTree v2 Case を「使える業務アプリ」に近づけることです。

新しい大きな domain model を増やすのではなく、既存の Case 機能を次の観点で安定させます。

- 検索
- フィルター
- ソート
- Board / List / Detail 導線
- loading / empty / error / partial-error state
- E2E smoke test
- 運用上の失敗状態の見え方

## Target Flow

```text
user opens dashboard
  -> sees case list / board
  -> searches and filters cases
  -> opens case detail
  -> returns to list without losing context
  -> sees clear loading / empty / error state
  -> critical smoke path is covered by E2E
```

## Scope

Task 18 で実装するもの:

- Dashboard の Case area を整理する。
- Case search input を追加する。
- Case filter controls を追加する。
- Case sort controls を追加する。
- Case list / board view toggle を追加する。
- Case detail から dashboard に戻る導線を整理する。
- `CaseCard` の表示情報を見直す。
- external invitation section と case list の位置関係を整理する。
- UI の loading / empty / error / partial-error state を統一する。
- Playwright E2E smoke test を追加または安定化する。
- README を成果単位で更新する。

Task 18 は「大きな新機能」ではなく「最終品質 gate」です。

## Out Of Scope

Task 18 では実装しないもの:

- 新しい Case domain model
- 新しい DynamoDB table
- 新しい GSI
- full-text search engine
- OpenSearch
- email notification
- 外部会社 user の task assignment
- 複数 assignee UI
- 大規模 migration
- GraphQL / OpenAPI client 生成

新 GSI が必要だと判断した場合は、実装前に必ず報告してください。

## Search / Filter / Sort

### Search

Task 18 の検索は、まず `GET /cases` が返した current user accessible cases を対象に client-side で実装します。

対象:

- title
- description
- caseId
- caseType
- status

理由:

- Task 18 で新 GSI を増やさないため。
- 現在の v2 規模では user accessible cases の一覧内検索で十分なため。
- production full-text search は別 task に分けるべき大きさのため。

### Filter

最低限の filter:

- caseType: `ALL` / `REQUEST` / `STANDARD` / `PROJECT`
- status: `ALL` / existing `CaseStatus`
- deliveryType: `ALL` / `DIRECT` / `OPEN`
- ownership: `ALL` / `CREATED_BY_ME` / `OWNED_BY_ME`

可能なら追加:

- due date: overdue / no due date / this week
- participant: internal / external participant visible

### Sort

最低限の sort:

- updatedAt desc
- createdAt desc
- dueDate asc
- status
- caseType

sort は UI 表示だけで行います。
server query contract を変更する必要がある場合は、実装前に報告してください。

## Board / List / Detail 導線

### List View

List view は scan しやすくします。

- title
- caseType
- status
- deliveryType
- owner
- dueDate
- updatedAt
- child / participant が分かる最低限の indicator

### Board View

Board view は `CaseStatus` ごとの column を基本にします。

最初から drag-and-drop は不要です。
Task 18 では board 表示と detail 遷移を優先します。

### Detail Navigation

Detail page では dashboard に戻れる導線を維持します。

可能なら query string で view state を保ちます。

例:

```text
/dashboard?caseView=board&caseType=PROJECT&status=IN_PROGRESS&q=...
```

ただし、実装が大きくなる場合は local state のみで構いません。
Task 18 の目的は安定化であり、複雑な routing framework を作ることではありません。

## UI State 基準

各 case UI は次を明示します。

- loading
- empty
- error
- partial-error
- disabled while submitting
- retry

既存 API が失敗した場合、画面全体を壊さず、該当 section に error を出します。

`alert()` に依存してはいけません。
console log だけで user-facing error を終わらせてはいけません。

## API / DynamoDB 方針

Task 18 の基本方針:

- 既存 `GET /cases` を使う。
- 新 route は原則追加しない。
- 新 GSI は原則追加しない。
- `Scan` を使わない。
- client から送られた権限情報を信頼しない。

もし API contract を変更する場合は、次を必ず報告してください。

- request query params
- response shape
- validation
- backward compatibility
- API tests
- deployment 影響

## E2E 方針

Task 18 では Playwright の smoke test を追加または安定化します。

既存:

- `package.json` に `test:e2e`
- `playwright.config.ts`
- `tests/e2e/login.spec.ts`

最低限の E2E:

- unauthenticated user が login page を見られる
- signup / verify など public route が壊れていない
- dashboard access が認証状態なしで安全に扱われる
- local app が起動して blank page にならない

AWS / Cognito / real test account が必要な E2E は、環境変数がない場合 skip 可能にします。
skip する場合は、理由を test output または README に明記します。

可能なら追加:

- authenticated smoke test
- case list UI smoke
- search/filter/sort UI smoke
- detail navigation smoke

E2E は flaky にしてはいけません。
固定 sleep に依存せず、locator と assertion を使います。

## Test Scope

必須:

- case search filter function の unit test、または component test 相当
- sort logic test
- empty / error state の UI 分岐確認
- API permission tests の既存 green 維持
- Playwright smoke test

可能なら追加:

- dashboard case list の interaction test
- board/list toggle test
- query state preservation test

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
yarn.cmd test:e2e
```

E2E が環境依存で skip になる場合は、skip 理由を報告してください。

Codex が軽量 review だけを行う場合、ユーザーの明示指示がない限り全体 test は実行しません。

## Deployment Impact

Task 18 は原則として infra 変更なしを目指します。

想定:

- new Lambda: no
- new API route: no
- new DynamoDB table: no
- new DynamoDB GSI: no
- IAM change: no

これらが必要になった場合は、実装前に報告してください。

## 禁止事項

- `Scan` を使わない。
- 新 GSI を勝手に追加しない。
- UI のために server-side permission を弱めない。
- client 側 filter 結果を authorization として扱わない。
- `alert()` だけで error を済ませない。
- fixed sleep 依存の E2E を書かない。
- unrelated refactor をしない。
- `repomix-output.xml` を編集しない。
- 勤務先プロジェクトの固有情報を code / docs / comments に入れない。

## 完了条件

Task 18 は、次を満たしたら完了扱いにできます。

- Dashboard Case area に search / filter / sort がある。
- List / Board view を切り替えられる。
- Case detail への導線と戻り導線が自然である。
- loading / empty / error / partial-error state が明確である。
- external invitation section が case list と衝突しない。
- Playwright smoke test が追加または安定化されている。
- API permission tests が壊れていない。
- 新 GSI / route / Lambda がない、または必要性と deployment 影響が説明されている。
- README が成果単位で更新されている。

## Claude への実装指示

```text
TaskTree v2 の Task 18 を実装してください。

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
- docs/workflow/task-18-case-search-ui-e2e-stabilization-plan.md

今回の目的は、v2 Case の最終仕上げとして、検索、フィルター、ソート、UI 導線、E2E smoke test、運用上のエラー状態を安定化することです。

実装範囲は `docs/workflow/task-18-case-search-ui-e2e-stabilization-plan.md` を基準にしてください。

必須要件:

1. Dashboard Case area に search / filter / sort を追加してください。
2. Case list / board view toggle を追加してください。
3. Board view は `CaseStatus` column を基本にしてください。drag-and-drop は不要です。
4. Case detail への導線と dashboard へ戻る導線を整理してください。
5. loading / empty / error / partial-error state を明確にしてください。
6. external invitation section と case list の表示が衝突しないようにしてください。
7. 既存 `GET /cases` を使い、Task 18 では原則 client-side search/filter/sort にしてください。
8. 新 route / new Lambda / new GSI は原則追加しないでください。
9. 新 GSI が必要だと判断した場合は、実装前に理由と deployment 影響を報告してください。
10. Playwright E2E smoke test を追加または安定化してください。
11. AWS / Cognito / real test account が必要な E2E は、環境変数がない場合 skip 可能にし、理由を報告してください。
12. README を成果単位で更新してください。

注意:

- `repomix-output.xml` は分析用です。直接編集しないでください。
- 変更前に必ず原本ファイルを読んでください。
- unrelated refactor はしないでください。
- `Scan` を使わないでください。
- UI のために server-side permission を弱めないでください。
- client-side filter を authorization として扱わないでください。
- `alert()` だけで error を済ませないでください。
- fixed sleep 依存の E2E を書かないでください。
- any / eslint-disable / 不要な韓国語コメントは入れないでください。

完了後に必ず以下を実行してください。

- yarn.cmd type-check:core
- yarn.cmd type-check:api
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build
- yarn.cmd workspace @task/infra build
- yarn.cmd workspace @task/infra cdk synth
- yarn.cmd test:api
- yarn.cmd test:e2e

最後に報告してください。

報告には以下を含めてください。

- 変更したファイル一覧
- 実装した search / filter / sort / board-list flow
- UI loading / empty / error / partial-error state
- E2E 追加内容と skip 条件
- API / DynamoDB / IAM / deployment 影響
- 実行した検証 command と結果
- Task 18 で意図的に未対応にしたこと
```
