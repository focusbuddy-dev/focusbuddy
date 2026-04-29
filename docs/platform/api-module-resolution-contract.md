# API モジュール解決契約

本ドキュメントは Issue #158 の成果物である。

目的は、`apps/api` におけるモジュール解決契約をリポジトリ所有として 1 本に揃え、TypeScript のコンパイル時チェック / Nest のローカル起動 / `dist` からの emit ランタイム実行 / Jest 実行 / Prisma コマンド経路で同一の意味を保つことを定めることである。

## スコープ

本ドキュメントが定めるもの:

- `apps/api` で現状サポートする import 識別子の形
- 手書き API コードに対する現行のアプリローカル import ルール
- 同一ルールが compile / ローカル起動 / `dist` ランタイム / Jest / Prisma コマンドに渡って成立すること
- 現状で意図的に未サポートの形
- 将来 API ローカルエイリアスの提案がサポートされる前に検証すべき項目

本ドキュメントが定めないもの: リポジトリ全体のエイリアス導入、パッケージ境界ポリシーの変更、アプリランタイムの純 ESM 化。

## 契約サマリ

`apps/api` の現行モジュール解決契約:

- アプリローカル import は `#api/*` を使用する。`apps/api` を起点とするリポジトリ所有の内部識別子
- ワークスペースパッケージ import は宣言済みパッケージ名と公開サブパスのみを使用する
- 外部依存は公開されたパッケージ識別子のみを使用する
- アプリローカルなランタイムコード / テスト / Prisma config はすべて同一の `#api/*` 識別子族を解決する

この契約は意図的に狭い。`apps/api` は内部識別子族を 1 つだけ所有し、ツール固有のエイリアスがドリフトしないよう、すべての実行経路を同じ意味に結線する。

## サポートされる識別子の形

### `apps/api/src` 配下のアプリローカルランタイムコード

アプリローカルコードには `#api/*` を使う。

例:

- `#api/health/health.module`
- `#api/config/local-runtime-env`
- `#api/prisma/prisma.service`

現行の手書き API ソースは、ランタイムエントリポイント / モジュール / サービス / アダプタで意図的にこのパターンを採用する。

### `apps/api/test` 配下の API テストファイル

テストから API ソースを import する際にも同じ `#api/*` 識別子を使う。

例:

- `#api/health/health.controller`
- `#api/logging/api-request-logging.interceptor`

これにより Jest はランタイムと同じ import 語彙に揃う。

### ワークスペースパッケージ import

宣言済みのパッケージ名と公開サブパスを使う。

例:

- `@focusbuddy/api-contract`
- `@focusbuddy/logger`
- `@focusbuddy/config-jest/api`

これはリポジトリ全体のワークスペース境界ルールに従う。

### Prisma config の import

`prisma.config.ts` から API ランタイムヘルパへも同じ `#api/*` 経由で import する。

例:

- `#api/config/local-runtime-env`

これにより Prisma CLI 経路は、コンパイル / ソース起動 / テスト / emit ランタイムが使うアプリローカル契約と整合する。

## 実行経路ごとの契約

### TypeScript のコンパイル時解決

`apps/api/tsconfig.json` は共有 API ベースラインを継承し、`module` と `moduleResolution` を `NodeNext` に設定する。

現行のリポジトリ所有のコンパイル時契約:

- `src` / `test` / `prisma.config.ts` 内のアプリローカル import に `#api/*`
- ワークスペースパッケージおよび外部依存は宣言済みパッケージ import
- ランタイム契約は `package.json#imports`、ソース側解決は `customConditions: ["development"]` を併用

### Nest のローカル起動

API のローカル dev コマンドは、手書き TypeScript ソースツリーから直接 Nest を起動する。

サポート契約:

- `NODE_OPTIONS=--conditions=development`
- `tsx` が `src/main.ts` を実行
- `#api/*` はパッケージ `imports` 契約により `./src/*.ts` に解決される

リポジトリは Nest 専用のエイリアスフックには依存しない。ソース起動も他経路と同じパッケージ `imports` 契約を使い、TypeScript 実行系のみ差し替える。

### `dist` からの emit ランタイム実行

parity / ビルド済みランタイム経路は emit 出力 `dist/main.js` を実行する。

サポート契約:

- TypeScript は emit 出力で `#api/*` 識別子を温存する
- Node はパッケージ `imports` を介して同じ `#api/*` を解決する
- 既定のパッケージ `imports` ターゲットは識別子を `./dist/*.js` に解決する

これが、契約を TypeScript の `paths` メタデータではなく `package.json#imports` に持たせている理由のひとつである。

### Jest 実行

API ワークスペースは `ts-jest` とローカル TypeScript config、加えて `#api/*` 用の Jest mapper を使う。

テスト解決契約:

- テストは `#api/*` で API ソースを import する
- パッケージ import は引き続きパッケージ名を使う
- Jest はテスト専用語彙を発明せず、リポジトリ所有の同一 `#api/*` 契約を反映する

### Prisma コマンド実行

Prisma CLI 経路は `apps/api/prisma.config.ts` から構成され、同ファイルは API ランタイム env ヘルパを `#api/*` 経由で import する。

サポート契約:

- `NODE_OPTIONS=--conditions=development`
- `#api/*` はパッケージ `imports` 経由で `./src/*.ts` に解決される
- ランタイム env 読み込みが使うソースファイルが、Prisma 専用エイリアスを足さずに到達できる

## 現状で未サポートの契約形

`apps/api` では以下を意図的に未サポートとする:

- `@/` / `~/` / 裸の `src/*` のようなアプリローカルエイリアス
- `#api/*` と並列の第二のアプリローカルエイリアス族
- ランタイム / Prisma 経路と共有しない Jest 専用エイリアス
- `dist` ランタイムが共有しない Nest 専用エイリアスフック
- 主たる API 契約と異なる Prisma config 専用エイリアス

これらを許すと、同一ワークスペースに複数の解決契約が並立し、リポジトリ所有の単一契約が崩れる。

## なぜ現行契約が現状で受容可能か

最短の表現ではないが、明示的で再現可能である:

- アプリローカルルールが compile / 起動 / ビルド済みランタイム / テスト / Prisma config で同一に動く
- emit ランタイムコードはソースツリーと同じ識別子を使う
- テストは「ランタイムにない第二の識別子語彙」を要さない
- Prisma config は「config 専用の相対 import 例外」を要さない
- リポジトリは NodeNext 互換なランタイム挙動を保ちつつ、ツール固有解決のドリフトを避けられる

## 将来のエイリアス前提条件チェックリスト

`apps/api` でアプリローカルエイリアス導入を将来提案する場合、以下をすべて同時に検証する:

1. 非推奨やツールに脆い設定を加えずに TypeScript コンパイル時解決がエイリアスを受け入れる
2. Nest 専用例外経路無しで、ソース起動が同じエイリアスを解決する
3. 隠れたローダ前提無しで、ビルド済み `dist` ランタイムが同じ識別子を解決する
4. テスト専用契約を作らずに、Jest が同じエイリアスを解決する
5. config 専用例外経路無しで、Prisma config と Prisma CLI 実行が同じエイリアスを解決する
6. 高速ローカル開発とパリティ志向ランタイム検証の双方が、同じモジュール解決ルールを行使する

現行の `#api/*` 契約は、`apps/api` においてこのチェックリストを満たしている。
