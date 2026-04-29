# モノレポのワークスペースレイアウト

本ドキュメントは Issue #18 の成果物である。

目的は、FocusBuddy における最初の Turborepo ワークスペースレイアウトとパッケージ境界を定義することである。

## スコープ

本ドキュメントが定めるもの:

- トップレベルの `apps` / `packages` レイアウト
- Web / API / モバイル / 共有パッケージの最初の責務分割
- リポジトリルートから使う基本的な Turborepo タスク構造

本ドキュメントが定めないもの: 詳細なアプリ実装、Prisma セットアップ詳細、OpenAPI 生成詳細。

## ワークスペースツリー

```text
apps/
  api/
  mobile/
  web/
packages/
  api-contract/
  config-jest/
  config-oxlint/
  config-prettier/
  config-typescript/
  logger/
```

## アプリ境界

### `apps/api`

- NestJS API アプリケーションを所有する
- API 境界内の Prisma 統合とデータベースアクセスを所有する
- データベース形状を直接漏らさず、永続化モデルを契約モデルへマッピングする

### `apps/web`

- Next.js Web アプリケーションを所有する
- API 形状を直接定義せず、生成された契約出力を利用する

### `apps/mobile`

- 将来のモバイルアプリ境界を予約する（実装は後回し）
- 後段で同じ契約出力と共有 logger ファサードを実用範囲で利用することを想定する
- 当面はプレースホルダワークスペースとして残る

## 共有パッケージの境界

### `packages/api-contract`

- OpenAPI の単一の真実源を所有する
- TypeScript 型、バリデーションヘルパ、API クライアント成果物などの生成契約出力を所有する

### `packages/config-typescript`

- 共有 TypeScript config ベースラインを提供する

### `packages/config-oxlint`

- 共有 oxlint ベースラインとランタイム別の override を提供する

### `packages/config-prettier`

- 共有 Prettier ベースラインを提供する

### `packages/config-jest`

- 共有 Jest ベースラインと、Web / API の環境分割を提供する

### `packages/logger`

- 共有 logger インタフェースとランタイム別アダプタを公開する

## 境界ルール

- アプリコードは `apps/*` 配下に置く
- 共有再利用コード / 設定は `packages/*` 配下に置く
- アプリワークスペースは、`packages/*` のコード / config を、相対パスではなくパッケージ名と公開エントリポイント経由で利用する
- アプリワークスペースは他のアプリワークスペースに直接依存しない
- パッケージワークスペースはアプリワークスペースに直接依存しない
- API 契約の所有は `packages/api-contract` に置き、API アプリ内には置かない
- Prisma とデータベースアクセスは API 境界内に留める。後の Issue が共有 DB パッケージを明示的に切り出さない限り維持する
- 生成された契約出力はアプリで利用するためのもので、アプリ内で手書き編集しない
- モバイルは予約状態を維持する。後で実装する際は同じパッケージ境界ルールに従う

リポジトリの境界チェックは `pnpm lint:boundaries` から強制され、`pnpm lint` はこのチェックをワークスペース lint タスクの前に実行する。

このチェックは、import 元ワークスペースの `package.json` に宣言の無いパッケージ import / tsconfig extends、および対象ワークスペースの公開 exports 外のサブパスを拒否する。

## 基本の Turborepo タスク構造

リポジトリルートはまず以下の共有コマンドを公開する:

- `pnpm build`
- `pnpm dev`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`

`turbo.json` は意図的に小さく保つ。

- `build` はローカル generate タスク、上流の generate、上流ワークスペースのビルドに依存する
- `dev` はキャッシュ非対象（長時間稼働の開発サーバを想定）
- `generate` は、下流の検証前にコミット済み / 必須の生成出力を整える
- `test` / `typecheck` はローカル generate、上流 generate、上流ビルドに依存し、ルートコマンドの順序を安定させる
- `lint` / `test` / `typecheck` はワークスペースレベルで定義され、ルートが整合的に統括する

## 関連 Issue へのハンドオフ

本ドキュメントが想定する後続作業は Issue #19（共有ツーリングベースライン）/ #20（OpenAPI 駆動の最初のパッケージ）/ #21（NestJS API 実装）/ #22（Next.js Web 実装）/ #23（共有 logger）/ #51（Docker ベースのローカル開発）/ #120（パッケージの ESM 移行）であり、いずれも完了している。経緯としてのみ参照する。

それぞれの最新ガイドは以下を参照する:

- 共有ツーリング: `docs/platform/shared-tooling.md`
- ESM 移行: `docs/platform/esm-migration-strategy.md`
- ローカル開発: `docs/platform/local-development.md`
