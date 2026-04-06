---
name: Epic
about: 大きな目的を親 Issue として定義し、子 Task を束ねるための Issue を作成する
title: "[Epic] "
labels: "type:epic, priority:medium, area:operations"
assignees: ""
---

種別: 設計

## 背景

この Epic が必要な理由を書く。

例:

- まとまったテーマを 1 本の親 Issue として管理したい
- 進捗管理の入口となる親チケットが必要
- 子 Task を束ねる目的と境界を明確にしたい

## 対象

- 誰またはどの領域に効くかを書く

## やることの範囲

- この Epic 配下で扱う成果物や論点を書く

## やらないことの範囲

- 後続 Issue や別 Epic に分けるものを書く

## 完了条件

- [ ] 子 Task が必要数に分解されている
- [ ] Epic 全体の目的が一文で説明できる
- [ ] 何をもって完了か説明できる

## 懸念点または未確定事項

- 未確定事項や依存関係を書く

## 子Issue

- [ ] #番号 子 Task 名

## 現在の工程

- ユーザ訴求 / 基本設計 / 詳細設計 / 実装 / 検証 / 運用・改善 のいずれかを書く

## 次の想定アクション

- 最初に進める子 Task を書く

## ラベルメモ

- 基本: `type:epic`, `priority:medium`, `area:operations`
- docs 主体なら `area:docs` へ変更してよい
- ブロック時は `status:blocked` を追加
