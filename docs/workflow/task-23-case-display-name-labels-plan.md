# Task 23: Case 表示名と UI ラベル整備

## 目的

Case 関連画面で Cognito userName / userId の UUID がそのまま表示される問題を解消し、利用者に意味のある表示名を出す。

同時に、`REQUEST`、`STANDARD`、`PROJECT`、`DIRECT`、`OPEN` などの enum 値を UI に直接出さず、日本語ラベルで表示する。

## 背景

Task 21 で Dashboard を Case-first に整理し、Task 22 で legacy standalone task flow を削除した。

現在の v2 Case flow では、Claim、Comment、History、CaseTask などで actor / author / owner / requester の ID がそのまま表示される箇所がある。

これは実運用では分かりにくいため、Task 23 で表示品質を改善する。

## Source Of Truth

作業前に以下を読む。

- `AGENTS.md`
- `GPT.md`
- `README.md`
- `docs/core/case-collaboration-model.md`
- `docs/core/package-boundaries.md`
- `docs/core/operational-quality-baseline.md`
- `docs/workflow/v2-case-development-roadmap.md`
- `docs/workflow/task-21-case-first-dashboard-workflow-plan_jp.md`
- `docs/workflow/task-22-remove-legacy-task-flow-plan.md`

## 対象画面

- Dashboard Case 一覧
- Case 詳細画面
- Comment
- History
- Claim request
- CaseTask 作業一覧
- ChildCase 表示
- Case 作成 modal

## In Scope

### 1. UUID 直接表示の解消

以下のような値を UI にそのまま出さない。

- Cognito userName
- userId
- creatorId
- ownerId
- requesterId
- actorId
- authorId
- assigneeId

表示名の優先順位は、既存データ構造に合わせて実装する。

推奨 fallback:

1. `name`
2. `email`
3. `displayName`
4. 短縮 ID（例: `a7c43a98...`）
5. `不明なユーザー`

既存 User API / repository / profile 情報で足りない場合は、tenant 分離と認可を守ったうえで API response に表示名を追加してよい。

### 2. Case 関連 enum の日本語ラベル化

UI に enum 値を直接出さない。

最低限、以下を日本語表示にする。

#### CaseType

- `REQUEST` → `依頼`
- `STANDARD` → `通常案件`
- `PROJECT` → `プロジェクト`

#### CaseDeliveryType

- `DIRECT` → `指名`
- `OPEN` → `公募`

#### CaseStatus

- `WAITING` → `待機中`
- `IN_PROGRESS` → `対応中`
- `REVIEW` → `確認中`
- `DONE` → `完了`
- `CANCELED` → `キャンセル`

#### CaseTargetScope

- `COMPANY` → `会社`
- `DIVISION` → `本部`
- `DEPARTMENT` → `部署`
- `TEAM` → `チーム`
- `USER` → `ユーザー`

#### Claim status

- `PENDING` → `申請中`
- `APPROVED` → `承認済み`
- `REJECTED` → `却下`
- `CANCELED` → `キャンセル`

#### CaseTaskStatus

既存ラベルがあれば再利用する。重複定義を減らす。

### 3. 共通 helper 化

ラベル変換は画面ごとに散らさない。

推奨配置:

- `packages/task-app/src/components/dashboard/caseLabels.ts`

または既存の dashboard helper があればそこへ統合する。

最低限まとめるもの:

- case type label
- delivery type label
- status label
- target scope label
- claim status label
- case task status label
- user display name helper

### 4. API response 改善

必要なら API response に表示名用フィールドを追加する。

例:

- `creatorName`
- `ownerName`
- `requesterName`
- `actorName`
- `authorName`
- `assigneeName`

ただし、既存 contract を壊さない。

既存 ID フィールドは残す。

tenant 分離:

- 他社ユーザー名を返さない。
- 参照できる Case / Comment / Claim / History / CaseTask の範囲だけ表示名を解決する。

### 5. README 更新

`README.md` に Task 23 の成果を日本語で簡潔に追加する。

細かい作業ログではなく、成果単位で書く。

## Out Of Scope

Task 23 では以下を実装しない。

- CaseTask の編集 / 削除 / 状態変更 / 担当者変更
- ChildCase 作成 UX
- OPEN case 専用探索画面
- Notification / email
- DB migration
- i18n 多言語化の全面拡張

## Review Points

- UUID が通常 UI にそのまま出ていない。
- Comment / Claim / History / CaseTask の actor 表示が利用者に分かる。
- enum 値が UI に直接表示されていない。
- ラベル変換が重複しすぎていない。
- API response を変更した場合、tenant 分離を壊していない。
- v2 CaseTask flow は保持されている。
- legacy standalone task flow は復活していない。
- deployment impact が README / 完了報告に書かれている。

## Deployment Impact

フロントエンドだけで完結する場合:

- CDK deploy 不要
- app build / hosting deploy のみ

API response を変更する場合:

- CDK deploy が必要になる可能性あり
- Lambda の IAM 追加が必要なら最小権限にする
- DynamoDB table / GSI 変更は原則なし

## Suggested Verification

```bash
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd test:api
```

## Completion Report Requirements

完了報告には以下を含める。

- UUID 表示を解消した画面
- 日本語ラベル化した enum
- 追加 / 変更した helper
- API 変更有無
- deployment impact
- 残課題
- 検証結果
