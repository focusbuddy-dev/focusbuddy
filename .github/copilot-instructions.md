# Copilot Request Routing Rules

この `.github/` は、他リポジトリへ移植しても動く自己完結の設定として扱う。

## Source Of Truth

`.github/` 配下の運用ルールの正本は `copilot-instructions.md` とする。

- agent、skill、hook はこのファイルの方針を具体化する派生物として扱う
- `.github/` 外の docs、archives、調査メモは背景説明や検討履歴であり、実行時の前提や参照元にはしない
- `.github/` 内で記述が衝突する場合は、このファイルを優先する

## Decision Table

| 条件                                             | 選ぶべきもの |
| ------------------------------------------------ | ------------ |
| 説明、比較、調査結果の提示だけが必要             | Ask          |
| 実装前の手順整理、段取り作成、計画立案が必要     | Plan         |
| 調査後にファイル生成、更新、コマンド実行まで必要 | Agent        |
| 部分問題が独立していて専門家に切り出す価値がある | subagent     |

## Subagent Preference

- `orchestrator-agent`: 依頼の入口整理、作業文脈の把握、specialist handoff
- `issue-agent`: Issue の確認、作成、更新、close、branch/worktree 判断
- `review-agent`: findings 先行の独立 review
- `task-manager`: タスク整理、優先順位、計画立案
- `monetization-agent`: 収益化、価格戦略、市場分析
- `Explore`: リポジトリ内の事実確認、読み取り専用探索

## Issue-First Implementation Rule

作成、更新、修正、追加などの実装依頼は、原則として Issue 起点で進める。

1. 依頼に Issue 番号や URL があるか確認する
2. 依頼に Issue 指定がなくても、現在ブランチ名や既存 worktree のブランチ名に `#<issue番号>` が含まれる場合は既存 Issue の明示指定として扱う
3. Issue 未確認なら、まず類似する既存 Issue があるか確認する
4. 類似 Issue がある場合は、その Issue で進めるかを確認する
5. 類似 Issue がない場合は、`issue-agent` の中で新規 Issue の本文と作成可否を確定する
6. Issue が確定したら、branch/worktree の整合確認へ進む

例外:

- 既存 Issue が明示され、その Issue で進めることが確定している場合
- 緊急修正で、先に復旧が必要だとユーザーが明示している場合
- 実装ではなく回答だけが目的の場合

## Clarification Rules

次のどれかが不明または曖昧な場合は、実行前に必ず質問する。

- 調査だけでよいのか、成果物生成まで必要なのか
- 出力先がどこか
- 新規作成か既存更新か
- 完了条件が何か
- どの専門 agent を優先すべきか
- 依頼の主目的が Ask / Plan / Agent のどれか

曖昧さや不明点がある場合の質問は省略してはならない。
確認は、不足している項目だけを原則 1 回でまとめて行う。
推定で十分に確定できる場合は、質問せずに進めてよい。

## Execution Start Rules

ファイル生成、ファイル更新、削除、コマンド実行を伴う依頼では、作業に入る前に次の 4 項目を agent が自律的に把握する。

- 目的
- 出力先または対象
- 操作種別
- 完了条件

4 項目は、依頼文、追加回答、文脈から agent が推定して組み立てる。
ユーザーへの手動確認は求めない。
ただし、推定できない項目や曖昧な箇所がある場合は、作業に入る前にユーザーへ質問する。

## Repository Update Preflight

リポジトリに更新をかける create / update / delete / run の直前には、現在の Git 文脈を必ず確認する。

- `git rev-parse --show-toplevel` で現在の作業ルートを確認する
- `git branch --show-current` で現在 branch を確認する
- `git worktree list --porcelain` で現在 branch と worktree path の対応を確認する
- current branch が detached、current worktree が一覧に存在しない、current branch が別 worktree に割り当て済み、のどれかに当たる場合は、まず不整合を確認する。ただし、更新対象が有効な Issue 専用 worktree 配下の絶対パスに明示的に限定され、その target 側の Git 文脈が整合している場合は、current workspace が main のままでも target 側を基準に続行してよい
- worktree を使わないリポジトリでも、少なくとも current branch と作業ルートの確認は省略しない
- Issue が確定した更新系作業は、main の current workspace では進めず、main から切った Issue 専用 worktree 上でだけ進める
- Issue 専用 worktree の配置先は必ず `.worktrees/` 配下に限定する
- `.worktrees/` 配下以外のトップレベルや任意ディレクトリに Issue 専用 worktree を新設してはならない
- Agent は `.worktrees/<issue-or-purpose>/` 以外の場所にある新規 worktree 作成や利用を提案せず、既存の逸脱配置がある場合も cleanup や退避のための最小操作以外では使わない
- チャットの current workspace が main のままでも、編集対象や実行対象が Issue 専用 worktree 配下の絶対パスに限定されている場合だけ更新を許容する。このときは current workspace の branch ではなく、target 側 worktree の branch と worktree path の整合を優先して判定する
- Issue 作成、Issue 確認、git preflight、git worktree add のような準備操作だけは main 上で行ってよい

## Tool Preference Rule

- Git 操作は標準の `git` CLI または通常ツールを優先する
- GitHub の Issue / PR / リポジトリ確認は `gh` CLI を優先する
- GitKraken MCP は使わない
- 新規の MCP サーバーや接続先にアクセスする前に、利用目的、無料 / 有料の見込み、セキュリティ上の懸念と許容理由を明示する

## GitHub Issue Check Rule

- Issue 状況確認は `gh issue` を優先する
- 一覧取得は `gh issue list` を基準にし、必要な場合だけ `--repo <owner>/<repo>` を補う
- 個別確認は `gh issue view <number>` を基準にし、必要な場合だけ `--repo <owner>/<repo>` を補う
- 認証や権限の切り分けが必要なときは、先に `gh auth status` を確認する

## GitHub Issue Comment Rule

- `gh issue comment` や `gh pr comment` は、現在の認証ユーザー名で投稿される前提で扱う
- その前提がない場合は、コメント冒頭に `AIエージェント代行:` のような明示を入れる

## Pull Request Creation Rule

- ベースブランチは固定値ではなく、依頼時点の現在ブランチを基準にする
- PR 作成前に、現在ブランチから新規ブランチを作成して作業を退避する
- 変更は適切な粒度の複数コミットに整理する
- `push` 完了後は、ユーザーから別指定がない限り元のブランチへ戻る
- PR 本文または先頭の明示で、AI エージェントが作成した PR であることが分かるようにする

## Implementation Comment And Module Rule

- hand-written exported code には、実装の役割や境界が分かる短い先行コメントを付ける
- コメントは長文の背景説明ではなく、原則として `Role:`、必要なら `Boundary:`、必要な場合だけ `Ref:` を短く残す
- pure re-export、generated code、または file-level comment で十分に役割が説明される framework 必須 export には重複コメントを要求しない
- 1 file 1 primary responsibility を原則とし、runtime boundary、change reason、side effect family が混ざったら責務単位ディレクトリと薄い `index.ts` / `index.tsx` を優先する
- module-local なテストは実装の近くに置くことを優先し、workspace-level setup や広域 integration だけを専用 test ディレクトリへ残す
- integration test は feature 内なら近接、複数 feature や framework entrypoint をまたぐなら専用 test ディレクトリへ置く
- `process.env` の直読みは env 専用 module に閉じ込め、`public`、`server`、`test` の layer をまたいで直接 import しない
- browser code は server-only module や request-only helper を import せず、production code は `src/testing/**` を import しない
- MSW や test fixture は明示的な non-production 境界に置き、preview data と fixture data を同じ module に混在させない
- view や pure helper に side effect を混ぜず、navigation、logging、I/O は action、hook、handler、adapter に置く
- export 名は `is`、`has`、`build`、`create`、`resolve`、`fetch`、`to` など役割が分かる語彙を優先する

## Responsibility Split

- 依頼の入口整理と不足確認は `orchestrator-agent` が担う
- Issue の確認、作成、更新、close、branch/worktree 判断は `issue-agent` が担う
- コミット粒度の整理は `task-manager` が担う
- リポジトリ内の事実確認は `Explore` を優先してよい
- 実際のブランチ作成、コミット、push、PR 作成は Agent が実行する
