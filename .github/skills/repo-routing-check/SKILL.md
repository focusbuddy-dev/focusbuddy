---
name: repo-routing-check
description: 'Use when deciding whether a request should be handled as Ask, Plan, Agent, or subagent, and when choosing between orchestrator-agent, issue-agent, research-agent, task-manager, monetization-agent, review-agent, or Explore.'
---

# Repo Routing Check

この skill は、このリポジトリ特有の Ask / Plan / Agent / subagent の判断を安定させるためのものよ。

## 使う場面

- 依頼が調査だけなのか、実装まで含むのか曖昧
- どの agent に振るべきか迷う
- 知識保存先に残すべきか、回答だけでよいか迷う
- 作業開始前に、依頼を 4 項目へ整形して内部で把握したい

## このリポジトリでの基本ルール

- 説明、比較、調査結果だけなら Ask
- 実装前の段取りや整理なら Plan
- 調査後にファイル更新やコマンド実行まであるなら Agent
- 部分問題が独立しているなら subagent

## agent 選択の優先順

- `orchestrator-agent`: 依頼の入口整理、作業文脈の把握、specialist handoff
- `issue-agent`: Issue 確認、更新、close、branch/worktree 判断
- `review-agent`: findings 先行の独立 review
- `research-agent`: 技術調査、知識テーマの深掘り
- `task-manager`: タスク整理、優先順位、計画化
- `monetization-agent`: 収益化、価格戦略、市場分析
- `Explore`: 読み取り専用の事実確認

## 実行前に把握する 4 項目

実行系に入る前は、ツール側の guard を前提にせず、次を依頼文と文脈から自律的に推定すること。

```text
目的:
出力先:
操作:
完了条件:
```

4 項目は、ユーザーの依頼文と文脈から推定する。ユーザーへの手動確認は求めない。
推定できない項目や曖昧な箇所がある場合は、その不足分だけを質問すること。
原則は 1 回でまとめて確認する。
確定後に同じ内容の再確認はしないこと。

## 判断の簡易フロー

1. まず主目的を決める
   - 調査
   - 計画
   - 実行
   - 振り返り

2. 次に成果物を決める
   - 回答だけ
   - 知識保存先に残す
   - タスク化する
   - ファイル更新する

3. 最後に出力先を決める
   - 既存更新
   - 新規作成
   - 任せる

## この設定での補足

- 調査タスクは、ユーザーが不要と言わない限り知識保存先に残す
- ただし Ask としての回答だけが明示または推定できる場合は、まずこのチャットで回答し、保存確認を前提化しない
- Ask かどうか曖昧な調査では、先に「回答だけ」か「知識保存あり」かだけを確認し、保存先や create/update は保存が必要になった場合に限って聞く
- Issue 確認は `gh` CLI を優先する
- 実行状態の正本は GitHub Issues / Projects
- 再利用可能な知識の正本は、移植先で定義された知識保存先とする

## やらないこと

- Ask / Plan / Agent の区別が曖昧なまま実行に入らない
- 保存先が不明な調査結果を勝手に docs 化しない
- 実行系で不明点があるままコマンドを走らせない
- 確定後に同じ意味の確認を分割して繰り返さない
