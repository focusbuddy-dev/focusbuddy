---
name: issue-secretary
description: 'Use when checking GitHub Issues for the current repository, listing issue status, summarizing open issues, checking assignees, or turning issue lists into next actions. Prefer gh CLI over MCP for issue checks.'
---

# Issue Secretary

この skill は、現在の GitHub リポジトリに対する Issue 確認を定型化するためのものよ。

この skill の責務はあくまで `確認` までで、close / comment / label 変更そのものを実行するための skill ではない。
操作が必要な場合は、ここで現状確認をした後に Agent 実行へ渡すこと。

## 使う場面

- Issue の一覧を見たい
- open / closed の件数を確認したい
- 特定 Issue の状態、担当、更新状況を見たい
- private リポジトリの Issue 状況を秘書機能として整理したい
- Issue 一覧から次アクションを作りたい
- 既存 Issue の更新前に、本文の不足を確認したい

## このリポジトリでの原則

- Issue 確認は MCP より `gh` CLI を優先する
- 認証が怪しい場合は最初に `gh auth status` を確認する
- 一覧取得は `gh issue list` を基準にし、必要な場合だけ `--repo <owner>/<repo>` を補う
- 個別確認は `gh issue view <number>` を基準にし、必要な場合だけ `--repo <owner>/<repo>` を補う
- GitKraken MCP はこちらから提案しない
- ユーザーが GitKraken MCP を指定しても、先に `gh` CLI で代替できる手順を示す
- 新規の MCP サーバーや MCP 接続先にアクセスする前に、何のために使うのかを明示する
- MCP を使う前に、少なくとも `利用目的`、`無料 / 有料の見込み`、`セキュリティ上の懸念と許容理由` を実行前に明示する
- 上の説明ができない限り、MCP を先に使わない
- `gh` で Issue コメントを投稿する場合は、AI エージェントの代理投稿であることを本文に明記する

既存 Issue を更新する前提の確認では、必要に応じて次の不足を点検してよい。

- 背景
- 対象
- やることの範囲
- やらないことの範囲
- 完了条件
- 懸念点または未確定事項
- `現在の工程`
- `次の想定アクション`

## コメント投稿ルール

- `gh issue comment` は認証中の GitHub ユーザー名で投稿される
- そのため、通常は「マスター本人が投稿した」ように見える
- この誤認を避けるため、コメント冒頭に `AIエージェント代行:` を入れる
- 例外は、別アカウントや GitHub App で実行している場合だけ

### コメント例

```text
AIエージェント代行:

Issue の現状確認を行った結果、〜〜と判断した。
```

## 基本手順

1. 認証状態の確認

```bash
gh auth status
```

2. open Issue 一覧の確認

```bash
gh issue list --state open
```

3. 全体一覧の確認

```bash
gh issue list --state all --limit 100
```

4. 特定 Issue の詳細確認

```bash
gh issue view 31
```

5. 条件検索

```bash
gh issue list --search "is:open assignee:@me"
gh issue list --search "is:open label:your-label"
```

## 出力のまとめ方

Issue 確認の返答では、少なくとも次を整理すること。

- open 件数
- closed 件数
- 重要そうな open Issue 一覧
- テーマごとのまとまり
- 次にやるべきこと

## やらないこと

- ユーザーの明示なしに Issue を close しない
- ユーザーの明示なしに Issue を編集しない
- Issue 確認だけの依頼で GitKraken MCP を提案しない
- Issue 確認だけの依頼で MCP を先に使わない
- close / comment / label 変更を、この skill 単体の責務として引き受けない
