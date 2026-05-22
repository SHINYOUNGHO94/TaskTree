# Task 25: ChildCase 作成 UX 整備

## 目的

Case 詳細画面で、親子 Case の作成導線を分かりやすくする。

現在、ChildCase の API と表示は実装済みだが、実際の画面上では「どこで子案件を作るのか」「PROJECT / STANDARD / REQUEST の関係がどうなるのか」が分かりにくい。

Task 25 では、Case 階層の作成 UX を整理し、以下の操作を自然に行えるようにする。

- PROJECT から STANDARD 子案件を作成する
- STANDARD から REQUEST 子案件を作成する
- 作成済み child case を確認し、詳細へ移動する
- 親 Case と子 Case の関係を画面上で理解できる

## Source Of Truth

作業前に以下を読む。

- `AGENTS.md`
- `GPT.md`
- `README.md`
- `docs/core/case-collaboration-model.md`
- `docs/core/package-boundaries.md`
- `docs/core/operational-quality-baseline.md`
- `docs/workflow/v2-case-development-roadmap.md`
- `docs/workflow/task-14-standard-child-case-flow-plan.md`（存在する場合）
- `docs/workflow/task-24-case-task-crud-assignee-plan.md`
- `repomix-output.xml`

`repomix-output.xml` は分析用。直接編集しない。

## 背景

v2 Case の意図:

- PROJECT: 複数の STANDARD を束ねる大きな単位
- STANDARD: 複数の REQUEST や CaseTask に分解できる通常案件
- REQUEST: 実際に誰かへ依頼する最小 Case
- CaseTask: Case 内の作業分解

Task 24 で CaseTask は操作可能になった。

Task 25 では、Case 階層の作成 UX を整理する。

## In Scope

### 1. ChildCase 作成導線

Case 詳細画面に明確な作成導線を置く。

推奨:

- PROJECT 詳細:
  - `通常案件を追加` button
  - 作成される child case type は `STANDARD`
- STANDARD 詳細:
  - `依頼を追加` button
  - 作成される child case type は `REQUEST`
- REQUEST 詳細:
  - child case 作成導線は出さない

ボタン文言は enum 生値ではなく日本語ラベルを使う。

### 2. ChildCase 作成 modal / panel

既存 inline form が分かりにくい場合は、modal にしてよい。

最低限必要な入力:

- title
- description
- deliveryType
- targetScope
- targetScopeId
- requiredRole
- dueDate

既存 CreateCaseModal の UX / policy を参考にする。

ただし、root Case 作成と ChildCase 作成は混同しない。

### 3. CaseType 制約

server side で制約する。

- parent `PROJECT` → child `STANDARD`
- parent `STANDARD` → child `REQUEST`
- parent `REQUEST` → child 作成不可

client 側だけの制御にしない。

### 4. 認可

ChildCase 作成可能 user:

- parent Case creator
- parent Case owner が USER で本人
- parent Case owner が TEAM / DEPARTMENT / DIVISION / COMPANY の場合、その組織を管理できる role

読み取り権限だけの user は作成不可。

server side で必ず検証する。

### 5. targetScope / requiredRole

ChildCase 作成時も root Case と同じく role 別の targetScope 制約を守る。

最低限:

- 他社 targetScopeId を指定できない
- 自分の管理範囲外 targetScopeId を指定できない
- `targetScope = USER` の場合は `deliveryType = DIRECT`
- `requiredRole` は作成者 role 以下

既存 createCase / CreateCaseModal の検証ロジックを参考にする。

### 6. ChildCase 一覧 UX

Case 詳細で child case を分かりやすく表示する。

必要:

- child case type label
- status label
- title
- dueDate
- owner / target が分かる場合は表示
- click で child Case 詳細へ遷移

PROJECT 詳細では:

- STANDARD child を一覧表示
- STANDARD 配下 REQUEST も見えるなら階層表示

STANDARD 詳細では:

- REQUEST child を一覧表示

### 7. Navigation

ChildCase card / row を click したら `/dashboard/cases/{childCaseId}` へ遷移する。

親 Case への戻り導線も自然にする。

### 8. History

ChildCase 作成時は既存 `CHILD_CASE_CREATED` history を維持する。

必要なら detail を分かりやすくする。

History 失敗時は本処理を失敗させない。

### 9. README

`README.md` に Task 25 の成果を日本語で簡潔に追加する。

細かい作業ログではなく、成果単位で書く。

## Out Of Scope

Task 25 では以下を実装しない。

- OPEN case 専用探索画面
- notification / email
- approval workflow 拡張
- comment edit / delete
- attachment
- time tracking
- DynamoDB GSI 追加
- legacy standalone task flow 復活

## Review Points

- PROJECT から STANDARD を作れる。
- STANDARD から REQUEST を作れる。
- REQUEST から child case を作れない。
- server side で CaseType 制約を検証している。
- server side で認可を検証している。
- targetScope / requiredRole が作成者権限を超えない。
- 他社 targetScopeId を指定できない。
- child case row/card から詳細へ遷移できる。
- enum 生値が UI に出ていない。
- Task 23 の label helper を使っている。
- Task 24 の CaseTask flow を壊していない。
- legacy `/tasks` flow を復活させていない。
- README に deployment impact が書かれている。

## Deployment Impact

既存 `POST /cases/{id}/children` を使うだけなら:

- CDK deploy 不要
- app build / hosting deploy のみ

API handler の認可 / validation を直す場合:

- Lambda code deploy が必要
- CDK stack 変更がなければ CDK deploy は必須ではない

新規 route / Lambda を追加する場合:

- CDK deploy 必要

DynamoDB table / GSI 変更は原則しない。

## Suggested Verification

```bash
yarn.cmd type-check:core
yarn.cmd type-check:api
yarn.cmd workspace @task/app lint
yarn.cmd workspace @task/app build
yarn.cmd workspace @task/infra build
yarn.cmd test:api
```

## Manual Check Scenario

AWS deploy 後に確認する。

1. PROJECT Case を作成する
2. PROJECT 詳細から STANDARD child を作成する
3. 作成した STANDARD child が PROJECT 詳細に表示される
4. STANDARD child を click して詳細へ移動する
5. STANDARD 詳細から REQUEST child を作成する
6. REQUEST child が STANDARD 詳細に表示される
7. REQUEST 詳細では child 作成導線が出ない
8. 権限のない user で child 作成できない
9. History に child 作成が記録される

## Claude Code への作業指示（韓国語）

```text
Task 25를 진행해주세요.

브랜치:
task25-child-case-creation-ux

목표:
Case 상세 화면에서 ChildCase 생성 UX를 명확하게 완성합니다.
PROJECT에서는 STANDARD child를 만들 수 있고, STANDARD에서는 REQUEST child를 만들 수 있어야 합니다.
REQUEST에서는 child 생성 버튼이 나오면 안 됩니다.

반드시 먼저 읽어주세요:
- AGENTS.md
- GPT.md
- README.md
- docs/core/case-collaboration-model.md
- docs/core/package-boundaries.md
- docs/core/operational-quality-baseline.md
- docs/workflow/v2-case-development-roadmap.md
- docs/workflow/task-24-case-task-crud-assignee-plan.md
- docs/workflow/task-25-child-case-creation-ux-plan.md
- repomix-output.xml

repomix-output.xml은 분석용입니다. 수정하지 마세요.

구현 범위:
1. Case 상세 화면에서 child 생성 버튼을 명확히 표시
   - PROJECT: `通常案件を追加`
   - STANDARD: `依頼を追加`
   - REQUEST: 버튼 없음

2. ChildCase 생성 form/modal 정리
   - title
   - description
   - deliveryType
   - targetScope
   - targetScopeId
   - requiredRole
   - dueDate

3. server side CaseType 제약
   - PROJECT parent → STANDARD child만 허용
   - STANDARD parent → REQUEST child만 허용
   - REQUEST parent → child 생성 불가
   - client 제어만으로 끝내지 말고 API handler에서 반드시 검증

4. server side 권한
   ChildCase 생성 가능:
   - parent Case creator
   - parent Case owner가 USER이고 본인
   - parent Case owner가 TEAM / DEPARTMENT / DIVISION / COMPANY인 경우 해당 조직을 관리 가능한 role

5. targetScope / requiredRole 검증
   - 다른 회사 targetScopeId 금지
   - 자기 관리 범위 밖 targetScopeId 금지
   - targetScope=USER이면 deliveryType=DIRECT
   - requiredRole은 작성자 role 이하만 허용

6. ChildCase 목록 UX
   - type label
   - status label
   - title
   - dueDate
   - click 시 `/dashboard/cases/{childCaseId}` 이동
   - enum raw 값 표시 금지
   - Task23의 caseLabels helper 활용

7. History
   - CHILD_CASE_CREATED 유지
   - history 실패는 본 처리 실패로 만들지 않음

8. README
   - Task25 내용을 일본어로 간결하게 추가
   - deployment impact 포함

주의:
- legacy `/tasks` flow 절대 부활 금지
- Task24 CaseTask 수정/삭제/담당자 기능 깨지면 안 됨
- DynamoDB GSI 추가하지 마세요
- diff.xml, repomix-output.xml 수정/커밋 금지

검증:
- yarn.cmd type-check:core
- yarn.cmd type-check:api
- yarn.cmd workspace @task/app lint
- yarn.cmd workspace @task/app build
- yarn.cmd workspace @task/infra build
- yarn.cmd test:api

완료 보고:
- 수정 파일
- API 변경 유무
- 권한/tenant 검증 내용
- UI 변경 내용
- deployment impact
- 남은 과제
- 검증 결과
```

## Codex/GPT へのレビュー依頼（韓国語）

```text
Task 25가 완료되었습니다.
npx repomix는 제가 갱신했습니다.
diff.xml도 생성했습니다.

당신은 리뷰만 해주세요.
테스트 실행은 제가 하겠습니다. 직접 테스트 명령은 실행하지 마세요.

반드시 먼저 확인:
- git status --short
- diff.xml
- docs/workflow/task-25-child-case-creation-ux-plan.md
- README.md
- docs/core/case-collaboration-model.md
- docs/workflow/v2-case-development-roadmap.md

중점 리뷰:
1. PROJECT → STANDARD child 생성만 가능한가
2. STANDARD → REQUEST child 생성만 가능한가
3. REQUEST에서 child 생성이 막히는가
4. 위 제약이 client뿐 아니라 API handler server side에도 있는가
5. ChildCase 생성 권한이 server side에서 검증되는가
6. 조직 owner admin 권한이 빠지지 않았는가
7. targetScopeId가 다른 회사 / 관리 범위 밖으로 지정되지 않는가
8. targetScope=USER일 때 deliveryType=DIRECT 강제가 유지되는가
9. requiredRole이 작성자 role을 넘지 않는가
10. child case list/card click으로 상세 이동이 되는가
11. enum raw 값이 UI에 그대로 나오지 않는가
12. Task23 caseLabels helper를 재사용했는가
13. Task24 CaseTask 기능을 깨뜨리지 않았는가
14. legacy `/tasks` flow가 부활하지 않았는가
15. README의 deployment impact가 정확한가
16. diff.xml / repomix-output.xml이 커밋 대상이 아닌가

리뷰 결과는 P1/P2/P3로 나눠주세요.
P1은 PR 전에 반드시 수정해야 하는 문제.
P2는 이번 Task에서 고치는 게 좋은 문제.
P3는 정리/품질 개선.

결론은 명확히:
- PR 가능
- 수정 후 PR 가능
- PR 금지

한국어 /cavemen 스타일로 짧고 직접적으로 답해주세요.
```

## Completion Report Requirements

完了報告には以下を含める。

- 変更ファイル
- ChildCase 作成 UX
- server side CaseType 制約
- 認可 / tenant 分離
- targetScope / requiredRole 検証
- History 記録
- deployment impact
- 残課題
- 検証結果
