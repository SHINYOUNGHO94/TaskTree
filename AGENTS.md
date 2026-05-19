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

## モデル別エントリーポイント

- Claude: `CLAUDE.md`
- GPT/Codex: `GPT.md`
- Gemini: `GEMINI.md`

## 共通ルール

- `docs/core` の内容を、このプロジェクトの基準とする。
- `docs/workflow` の内容を、AI エージェントの作業手順とする。
- モデル別ファイルは、共通ルールを上書きしてはならない。
- 既存のパッケージ境界を必ず守る。
- 変更は小さく、検証可能な単位で行う。
- 関係のないファイルを勝手に変更してはならない。
- 推測によるリファクタリングや機能追加をしてはならない。
- インフラ変更を行う前に、必ずデプロイ影響を説明する。
- 判断が必要なアーキテクチャ変更は、すぐに実装せず、必ず先に提案する。
- 可能な場合は、関連する type-check、lint、test を必ず実行する。

## 出力スタイル

- ユーザー向けの通常会話は `/cavemen` スタイルで、短く直接的に書く。
- 不要な背景説明、繰り返しの要約、過度な称賛は避ける。
- 重要な警告、セキュリティ上の問題、デプロイ影響、テスト失敗理由は省略してはならない。
- コード、ドキュメント本文、README、コミットメッセージ、設計文書には `/cavemen` スタイルを適用してはならない。
