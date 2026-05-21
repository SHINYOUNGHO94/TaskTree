# AGENTS.md

このリポジトリでは、GPT/Codex、Claude、Gemini など複数の AI エージェントを利用して TaskTree を改善します。

すべての AI エージェントは、作業前に以下の共通ドキュメントを必ず読み、必ず従ってください。

## 最初に読むドキュメント

- `docs/core/product-goal-v2.md`
- `docs/core/ai-coding-principles.md`
- `docs/core/current-architecture.md`
- `docs/core/package-boundaries.md`
- `docs/core/coding-rules.md`
- `docs/workflow/ai-team-workflow.md`
- `docs/core/case-collaboration-model.md`
- `docs/workflow/v2-case-development-roadmap.md`

## モデル別エントリーポイント

- Claude: `CLAUDE.md`
- GPT/Codex: `GPT.md`
- Gemini: `GEMINI.md`

## 共通ルール

- `docs/core` の内容を、このプロジェクトの基準とする。
- `docs/workflow` の内容を、AI エージェントの作業手順とする。
- モデル別ファイルは、共通ルールを上書きしてはならない。
- 既存のパッケージ境界を必ず守る。
- 変更はユーザーが確認できる業務フロー単位で行い、検証可能な範囲に収める。
- API 1 本、ボタン 1 つだけの小さすぎる単位で PR を分けすぎない。
- 関係のないファイルを勝手に変更してはならない。
- 推測によるリファクタリングや機能追加をしてはならない。
- インフラ変更を行う前に、必ずデプロイ影響を説明する。
- 判断が必要なアーキテクチャ変更は、すぐに実装せず、必ず先に提案する。
- 可能な場合は、関連する type-check、lint、test を必ず実行する。
- README は細かい作業ログではなく、まとまった成果単位で簡潔に更新する。

## Repomix 使用規則

- `repomix-output.xml` がある場合、まず全体構造の把握に使う。
- `repomix-output.xml` は分析用の圧縮ファイルである。直接修正してはならない。
- 実際の修正は必ず原本ファイルに対して行う。
- 修正前に対象の原本ファイルを必ず再読する。
- `repomix-output.xml` はコミット対象に含めてはならない。

## v2 Case 開発基準

- v2 の新機能は `docs/core/case-collaboration-model.md` を基準とする。
- v2 Case の中長期的な作業順序は `docs/workflow/v2-case-development-roadmap.md` を参照する。
- `docs/core/case-collaboration-model_kr.md` は韓国語の企画参考文書であり、実装基準ではない。
- `docs/workflow/v2-case-development-roadmap_kr.md` は韓国語の参考文書であり、実装基準ではない。
- 既存の `task` を v2 の最上位案件として拡張してはならない。
- 新規設計は `case` 中心で進める。
- GSI 追加・変更はインフラ変更であり、実装前にデプロイ影響を必ず確認する。

## 出力スタイル

- ユーザー向けの通常会話は `/cavemen` スタイルで、短く直接的に書く。
- 不要な背景説明、繰り返しの要約、過度な称賛は避ける。
- 重要な警告、セキュリティ上の問題、デプロイ影響、テスト失敗理由は省略してはならない。
- コード、ドキュメント本文、README、コミットメッセージ、設計文書には `/cavemen` スタイルを適用してはならない。
