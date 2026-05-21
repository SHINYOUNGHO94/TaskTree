# 運用品質基準

このドキュメントは、TaskTree v2 の運用品質基準を定義します。

TaskTree には、過去の実務運用プロジェクトで得た一般的な設計・開発経験を適用できます。
ただし、勤務先プロジェクトの固有コード、コメント、データ、秘密情報、業務固有実装をコピーしてはなりません。
吸収してよいのは、一般化されたエンジニアリング原則と個人の実務経験だけです。

## 目的

TaskTree v2 はデモではなく、将来運用可能なアプリケーションとして扱います。

残りの Case 作業では、必ず次を改善または維持します。

- 認可の正しさ
- データ分離
- 予測可能な API 契約
- DynamoDB access pattern の安全性
- 最小権限 IAM
- UI 上の明確なエラー表示
- 検証可能なデプロイ影響

## API Handler 基準

ユーザーデータを読み書きする API handler は、必ず次を確認します。

- Cognito authorizer claim が存在する。
- server 側 repository から user profile を取得する。
- client が送った `companyId`、`creatorId`、`ownerId`、`teamId`、`projectId`、`parentCaseId`、role を信頼しない。
- route が明示的に許可しない field は reject する。
- repository 書き込み前に required field を検証する。
- business data を返す前に cross-company access を拒否する。
- 権限判定は route ごとに行い、「同じ会社だから許可」にしない。
- 重要な mutation は、現在の model が対応している範囲で history または audit 相当 record を残す。
- 可能な限り shared error helper で error response を返す。
- catch block で重要な失敗を隠さない。非重要な失敗として扱う場合も log を残す。

同じ会社の user がすべての data を見られる設計にしてはなりません。

## 認可基準

認可は層で分けます。

1. Authentication: 有効な Cognito identity がある。
2. Profile: server 側 user profile がある。
3. Tenant boundary: 対象 data が caller の company に属する。または明示的に対応した外部参加 model に属する。
4. Case permission: creator、owner、assignee、participant、target scope、required role、claim state、workflow rule のいずれかで許可される。
5. Mutation authority: 書き込み操作は読み取りより強い条件を必要とする。

`OPEN` case と将来の external-company participation では、case を発見できることと詳細を読めることを分けます。
discovery、detail reading、claiming、commenting、history reading、assignment change は別権限です。

## Case Workflow 基準

Case hierarchy rule は明示的に保ちます。

- root `PROJECT`、`STANDARD`、`REQUEST` は `POST /cases` で作成する。
- child case は `POST /cases/{id}/children` で作成する。
- server が parent から child case type を推論する。
- client が送った hierarchy field は route contract に従って無視または reject する。
- 設計文書で変更しない限り、v2 hierarchy は `PROJECT -> STANDARD -> REQUEST -> task` を維持する。
- 既存 `task` を v2 top-level case にしてはならない。

Task 16、Task 17、Task 18 では、次の test を追加または維持します。

- same-company allowed access
- cross-company denied access
- role/scope denied access
- unsupported child hierarchy denied access
- missing profile denied access

## DynamoDB 基準

DynamoDB 変更は access pattern から始めます。

GSI を追加または変更する前に、必ず次を文書化します。

- GSI が必要な query
- partition key と sort key
- 想定 cardinality
- write path への影響
- backfill または migration 影響
- deployment 影響

access pattern が合う場合は既存 index を再利用します。
新 workflow のために production shortcut として `Scan` を使ってはなりません。

transaction write は IAM と一緒に確認します。

- `TransactWriteCommand` を使う code には `dynamodb:TransactWriteItems` が必要です。
- 権限は必要な Lambda のみに付与します。
- infra を触った場合は `cdk synth` で確認します。

## IAM / Infrastructure 基準

IAM は最小権限を維持します。

infra 変更時の実装報告には、必ず次を書きます。

- new Lambda: yes/no
- new API route: yes/no
- new DynamoDB table/GSI: yes/no
- IAM permission change: yes/no
- deployment required: yes/no

IAM、API Gateway、Cognito、DynamoDB、Lambda wiring を変更した場合は次を実行します。

```text
yarn.cmd workspace @task/infra build
yarn.cmd workspace @task/infra cdk synth
```

local sandbox で `cdk synth` が実行できない場合は、理由を明確に報告します。

## Frontend 基準

UI は運用上重要な失敗を隠してはなりません。

data-loading UI には次を用意します。

- loading state
- empty state
- error state
- nested request などの partial-error state

client-side permission check は UX guard です。
security boundary は常に server-side handler です。

不安定な `useEffect` dependency による重複 fetch loop を避けます。
parent data と child data を読む画面では、request trigger を分けます。

## API Contract 基準

TaskTree にはまだ generated OpenAPI contract がありません。
そのため、新規または変更 route は task workflow 文書または README summary に契約を明記します。

- method and path
- request body
- response body
- allowed roles or ownership rules
- important error cases
- deployment impact

OpenAPI または generated client types の導入は、将来 task として別途計画します。

## Security Headers / Responses

API response helper を refactor する場合は、成熟した serverless app と同種の運用品質を検討します。

- consistent JSON error shape
- intentional CORS policy
- `X-Content-Type-Options: nosniff`
- HTTPS deployment path で安全な場合の HSTS
- log に secret、token、full request body を出さない

関係ない feature task の中で、大きな response/security-header refactor をしてはなりません。

## Verification 基準

変更範囲を覆う最小の検証を実行します。

よく使う command:

```text
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd test:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
```

infra または IAM を変更した場合は `cdk synth` を追加します。
user-facing workflow を変更した場合は、local environment が許す範囲で UI runtime または E2E 確認を追加します。

## Task 16-18 Review Checklist

task 完了前に必ず確認します。

- cross-company data leak がない。
- broad same-company read shortcut がない。
- client-supplied identity / hierarchy field を信頼していない。
- UI で nested API failure を silent にしていない。
- 新しい DynamoDB access pattern に index review がある。
- transaction に IAM permission がある。
- infra 変更に deployment impact report がある。
- 関連する type-check、lint、build、test を実行した。または理由を明確に説明した。
