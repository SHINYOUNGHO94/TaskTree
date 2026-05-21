# v2 Case Development Roadmap

このドキュメントは、`docs/core/case-collaboration-model.md` を実装していくための中長期ロードマップです。

各 Task の詳細な作業内容は、必要に応じて `docs/workflow/task-*-*.md` に分離します。

## 基本方針

- v2 の新機能は `case` 中心で進める。
- 既存 `task` を v2 の最上位案件として拡張してはいけません。
- 1 Task は、ユーザーが体感できる 1 つのまとまった業務フローを基準にする。
- API、UI、infra、test を必要以上に分離しすぎず、動作確認できる単位でまとめる。
- ボタン 1 つ、API 1 本、画面 1 つだけのような小さすぎる単位は避ける。
- ただし、Project、外部会社、OPEN case、承認フローのような大きな機能は、安全に検証できる境界で段階的に分ける。
- README は各小タスクの詳細ログではなく、まとまった成果単位で要約する。

## 推奨フェーズ

### Phase 1: 社内 Case の基本利用

社内ユーザーが case を作成し、一覧・詳細・状態変更・作業連携まで使える状態にする。

- Task 8: `getCases API + Case 一覧 UI`
- Task 9: `getCase API + Case 詳細画面`
- Task 10: `Case 状態変更`
- Task 11: `Case 作業実行フロー`
  - Case 詳細から task を作成する
  - task を必ず Case に紐付ける
  - Case 詳細で配下 task 一覧を表示する
  - Case と task の状態が混ざらないようにする
- Task 12: `Case 協業ログ`
  - Case History 自動記録
  - Case Comment 機能
  - Case 詳細に History / Comment 表示を追加する
  - 権限のないユーザーに履歴・コメントを見せない

### Phase 2: REQUEST / STANDARD / PROJECT 階層

案件の大きさに応じて、REQUEST、STANDARD、PROJECT を使い分けられる状態にする。

- Task 13: `STANDARD case 業務フロー`
  - STANDARD case 作成 UI
  - STANDARD から REQUEST または task へ分解する流れ
  - STANDARD 詳細で下位 case / task を確認する
- Task 14: `PROJECT 階層フロー`
  - PROJECT 作成 UI
  - PROJECT -> STANDARD -> REQUEST 階層表示
  - project 詳細で下位 case 構造を確認する

### Phase 3: OPEN Case と社外協業

案件を特定組織へ直接渡すだけではなく、公開し、担当希望、承認、会社間協業へ広げる。

- Task 15: `OPEN case と Claim flow`
  - OPEN case 公開
  - Claim request
  - Claim 承認 / 却下
  - 申請中・申請可能 UI
- Task 16: `外部会社参加フロー`
  - 外部会社の招待
  - participant company 表示
  - 会社間ロールの初期整理

### Phase 4: 権限・割当・公開範囲の正式化

協業が複雑になっても、安全に閲覧・更新・参加範囲を制御できる状態にします。

- Task 17: `Case 権限・割当 record 正式化`
  - 権限別 Case 公開範囲の整理
  - Assignment record の正式化
  - Visibility record の正式化
  - 必要な GSI / IAM 影響を事前確認する

### Phase 5: 利用性・運用品質の強化

商用利用を意識し、検索、フィルター、UI 動線、テスト、運用安定性を高めます。

- Task 18: `Case 検索・UI 導線・E2E 安定化`
  - Case 検索 / フィルター / ソート
  - Board / List / Detail 動線整理
  - E2E テスト
  - 運用上のエラー状態整理

## 進め方の目安

Task 11 以降は、API 1 本ごとに PR を分けすぎないようにします。

目安:

- 小さすぎる例: ボタン 1 つ、モーダル 1 つだけを追加する。
- 適切な例: API、service、UI、状態表示、テストをつなぎ、ユーザーが 1 つの業務フローを確認できる。
- 大きすぎる例: Case 作業実行、History、Comment、OPEN、外部会社連携を 1 Task にまとめる。

## 現在位置

Task 10 までで、`REQUEST` case の作成、一覧、詳細、状態変更まで確認できる入口を作りました。

Task 11 からは、Case 詳細から実作業 task を作成・確認できる状態へ広げます。

## 注意

このロードマップは固定ではありません。

実装中に API 契約、DynamoDB access pattern、権限モデル、UI 複雑度の問題が見つかった場合は、無理に進めず、次の Task 文書で範囲を調整します。
