# v2 Case Development Roadmap

このドキュメントは、`docs/core/case-collaboration-model.md` を実装していくための中長期ロードマップです。

各 Task の詳細な作業内容は、必要に応じて `docs/workflow/task-*-*.md` に分離します。

## 基本方針

- v2 の新機能は `case` 中心で進める。
- 既存 `task` を v2 の最上位案件として拡張してはいけません。
- 1 Task は、ユーザーが体感できる 1 つの業務フローを基準にする。
- API、UI、infra、test を必要以上に分離しすぎず、動作確認できる単位でまとめる。
- ただし、Project、外部会社、OPEN case、承認フローのような大きな機能は必ず段階的に分ける。

## 推奨フェーズ

### Phase 1: 社内 Case の基本利用

社内ユーザーが case を作成し、一覧・詳細・状態変更・作業連携まで使える状態にする。

- Task 8: `getCases API + Case 一覧 UI`
- Task 9: `getCase API + Case 詳細画面`
- Task 10: `Case 状態変更`
- Task 11: `Case 配下の task 作成と紐付け`
- Task 12: `History 自動記録`
- Task 13: `Comment 機能`

### Phase 2: REQUEST / STANDARD / PROJECT 階層

案件の大きさに応じて、REQUEST、STANDARD、PROJECT を使い分けられる状態にする。

- Task 14: `STANDARD case 作成 UI`
- Task 15: `STANDARD から REQUEST / task へ分解する流れ`
- Task 16: `PROJECT 作成 UI`
- Task 17: `PROJECT -> STANDARD -> REQUEST 階層 UI`

### Phase 3: OPEN Case と社外協業

案件を特定組織へ直接渡すだけではなく、公開し、担当希望、承認、会社間協業へ広げる。

- Task 18: `OPEN case 公開`
- Task 19: `Claim request / 承認フロー`
- Task 20: `外部会社の招待と参加モデル`
- Task 21: `会社間ロール: requester / owner / partner`

### Phase 4: 権限・割当・公開範囲の正式化

協業が複雑になっても、安全に閲覧・更新・参加範囲を制御できる状態にします。

- Task 22: `権限別 Case 公開範囲の整理`
- Task 23: `Assignment record の正式化`
- Task 24: `Visibility record の正式化`

### Phase 5: 利用性・運用品質の強化

商用利用を意識し、検索、フィルター、UI 動線、テスト、運用安定性を高めます。

- Task 25: `Case 検索 / フィルター / ソート`
- Task 26: `UI 整理: Board / List / Detail 動線`
- Task 27: `E2E テストと運用安定化`

## 進め方の目安

Task 8 以降は、Task 7 のような小さすぎる単位を避けます。

目安:

- 小さすぎる例: ボタン 1 つ、モーダル 1 つだけを追加する。
- 適切な例: API、service、UI、状態表示をつなぎ、ユーザーが 1 つの流れを確認できる。
- 大きすぎる例: Case 一覧、詳細、編集、コメント、外部会社連携を 1 Task にまとめる。

## 現在位置

Task 7 までで、画面から `REQUEST` case を作成できる入口を作りました。

Task 8 からは、作成した case を一覧で確認し、Case 機能を実際の業務フローとして使える状態へ広げます。

## 注意

このロードマップは固定ではありません。

実装中に API 契約、DynamoDB access pattern、権限モデル、UI 複雑度の問題が見つかった場合は、無理に進めず、次の Task 文書で範囲を調整します。
