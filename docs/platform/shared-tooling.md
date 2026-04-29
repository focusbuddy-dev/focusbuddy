# 共有ツーリングのベースライン

本ドキュメントは Issue #19 の成果物である。

目的は、FocusBuddy における TypeScript / oxlint / Prettier / Jest の最初の共有ベースラインを定義することである。

## スコープ

本ドキュメントが定めるもの:

- `packages/config-*` 配下の共有 config パッケージ
- API と Web ツーリングの最初のランタイム分割
- リポジトリレベルのフォーマット / lint コマンド
- 生成ファイルの既定取り扱いルール

本ドキュメントが定めないもの: アプリケーションコード、E2E テスト戦略、初期マージゲート以降のデプロイ環境向けワークフロー結線。

## 共有 config パッケージ

### `packages/config-typescript`

- `base.json` はモノレポ全体に安全な strict な TypeScript デフォルトを提供する
- `api.json` は base を継承し、NestJS API 用の Node 指向のモジュール設定を加える
- `web.json` は base を継承し、Next.js Web アプリ用のブラウザ / バンドラ設定を加える
- ブラウザ向けの Web コードは共有 Node グローバルを継承しない。将来の Web ワークスペースがツーリング目的で Node 型を必要とする場合、別のツーリング tsconfig からオプトインする

### `packages/config-oxlint`

- `base/oxlint.config.ts` は共有 lint ベースラインと生成ファイル無視ルールを定義する
- 共有 base は手書きコードに対し既定で strict であり、リポジトリの「`undefined` 優先 / non-null assertion 禁止」ポリシーを強制する
- `repository/oxlint.config.ts` は本リポジトリのスクリプトおよび設定ファイル向けのルートリポジトリ config である
- リポジトリ config は、共有 base を全コードで弱めるのではなく、スクリプトや GitHub ヘルパパスに対する狭い override を持つ
- `api/oxlint.config.ts` は base を継承し Node ランタイムを設定する
- `web/oxlint.config.ts` は base を継承しブラウザランタイムを設定する
- oxlint ベースラインを TypeScript で書いているのは、本リポジトリが JSON 専用の lint 設定経路ではなく oxlint を選択した理由のひとつである

### `packages/config-prettier`

- `index.mjs` がフォーマット決定の単一の真実源である
- 引用符スタイルはここで定義され、レビューでスタイルコメントを繰り返す必要がない
- リポジトリルートは `prettier.config.mjs` 経由で本パッケージを利用する

### `packages/config-jest`

- `base.ts` は共有 Jest デフォルトを定義する
- `api.ts` は API テスト環境を Node に設定する
- `web.ts` は Web テスト環境を jsdom に設定する
- `define.ts` はツーリングファイル向けの共有 Jest config 型契約を所有する
- リポジトリは TypeScript 製 config ファイルの Jest ローダとして `ts-node` を使用する
- アプリレベルの Jest config は、低レベルの Jest 型パッケージを直接 import せず、共有の Jest 型ヘルパを利用する
- 共有 Jest ベースラインは、後続 Issue で実アプリのソースツリーが揃うまでディレクトリ非依存で保たれる
- 共有 Jest ベースラインは、後続のアプリ作業で実トランスフォームを選択するまで TypeScript テスト実行を有効化しない

## 共有 config 利用ルール

- アプリワークスペースは、`@focusbuddy/config-jest/web` のようにパッケージ名と公開サブパス経由で共有 config パッケージを利用する
- アプリワークスペースは `../../packages/config-jest/...` のような相対パスで `packages/*` に直接アクセスしない
- アプリレベルの config / テストファイルが共有 config パッケージを import する場合、当該アプリは自身の `devDependencies` でそのパッケージを宣言する
- 共有 config パッケージが安定したサブパスを公開している限り、TypeScript の config 継承にも本ルールを適用する
- `jest` / `oxlint` / `ts-node` / `stylelint` のようなルート所有のツール実行は、リポジトリ所有のコマンドエントリポイント経由で意図的に呼び出される場合、引き続きリポジトリルートに置いてよい

## リポジトリコマンド

リポジトリルートは現在以下を公開する:

- `pnpm format`: Prettier を適用する
- `pnpm format:check`: 書き換えなしでフォーマットを検証する
- `pnpm lint:boundaries`: モノレポ境界ルールを破るワークスペース間 import / 依存を拒否する
- `pnpm lint`: ルート oxlint チェックの後にワークスペース lint タスクを実行する
- `pnpm merge-gate`: 初期マージ検証のシーケンスを実行する
- `pnpm test`: 既存のルート / ワークスペーステストフローを維持する
- `pnpm typecheck`: 既存のワークスペース typecheck フローを維持する

初期マージゲートのシーケンス:

- `pnpm generate`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

これにより、下流の検証ステップ前に生成された契約出力が利用可能になる。

ルートの `turbo.json` のタスクグラフも `generate` を `build` / `typecheck` / `test` の前に置いており、これらのルートコマンドを個別に呼んだときも同じ順序が保たれる。

ワークスペース境界チェックは現状以下のリポジトリ最低ルールを強制する:

- apps は packages に依存できるが、他の apps には依存できない
- packages は packages に依存できるが、apps には依存できない
- ワークスペースコードは相対パス import で他ワークスペースに踏み込まない
- 共有パッケージは宣言済みのパッケージ名と公開サブパス経由でのみ利用する
- ワークスペースの import および tsconfig の extends は、`package.json` で対応するワークスペース依存を宣言済みでなければならない
- ワークスペースのパッケージ import は対象パッケージの公開サブパス内に留める

リポジトリは GitHub Actions により、プルリクエストおよび `main` への push に対して同じマージゲートを実行する。

デプロイ専用のチェックは本マージゲートの外に残す。例: デプロイ後の受入チェック、デプロイ承認ルール、非ローカル環境でのみ実行する検証。

リポジトリ全体のパッケージ ESM 移行戦略は `docs/platform/esm-migration-strategy.md` に文書化されている。追加のワークスペースパッケージを明示的 ESM へ変換する前にこれを参照する。

新規手書きコードのリポジトリ全体の言語ベースラインは `docs/platform/typescript-first-coding-policy.md` に文書化されている。

アプリローカルの import パスと推奨される関数宣言スタイルに関する現行ポリシーは `docs/platform/import-and-function-style-policy.md` に文書化されている。

`apps/api` のコンパイル / 起動 / ビルド済みランタイム / Jest / Prisma コマンドにまたがるモジュール解決契約は `docs/platform/api-module-resolution-contract.md` に文書化されている。

新規手書きの JavaScript / TypeScript / ツール config ファイルにおけるリポジトリの既定は ESM 先行である。残存する CommonJS ファイルは、ESM 戦略文書のファイル単位の例外として明示追跡する。

言語ベースラインのポリシーは ESM 戦略から意図的に分離している。「ファイル記述言語」と「モジュール形式」を後の Issue が混同しないようにするためである。

## 生成ファイルのルール

生成出力は可能な限り `generated` / `__generated__` ディレクトリ配下に置く。

共有 Prettier / oxlint のベースラインは、これらのディレクトリを既定で無視する。

将来の Issue がそれら以外の場所にコミット済み生成ファイルを必要とする場合、その Issue で同時に共有ツーリング config を更新する。

手書きのラッパコードは生成ディレクトリの外に置き、フル lint / format チェックを受けさせる。

手書きのアプリ / パッケージコードは、境界やツール固有の経路に文書化された例外がある場合を除き、`null` より `undefined` を優先する。

## ランタイム別の利用

API / Web のワークスペースには、共有ベースラインを指す以下のローカル config ファイルが含まれる:

- `apps/api/tsconfig.json`
- `apps/api/oxlint.config.ts`
- `apps/api/jest.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/oxlint.config.ts`
- `apps/web/jest.config.ts`

これにより Issue #21 / #22 はツール既定の再決定ではなくアプリ実装に集中できる。

## 関連 Issue へのハンドオフ

本ドキュメントが想定する後続作業は Issue #21 / #22（実アプリ統合）、Issue #24（ルートコマンド整備）、Issue #71（GitHub Actions マージゲート整合）であり、いずれも完了している。歴史的な経緯としてのみ参照する。
