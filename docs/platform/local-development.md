# ローカル開発環境

本ドキュメントは Issue #51 の成果物であり、Issue #21 / #22 / #106 の成果も統合している。

目的は、FocusBuddy における Docker ベースのローカル開発環境を定義することである。

レーン分割（fast / parity / ホスト直接起動）の役割と、ローカル環境のドリフトポリシーは [local-execution-and-drift-policy.md](./local-execution-and-drift-policy.md) を参照する。本ドキュメントは「どう動かすか」を扱い、向こうは「なぜそのレーンか / 何を守るか」を扱う。

## スコープ

本ドキュメントが定めるもの:

- ローカル Docker オーケストレーションの構成
- Web / API / PostgreSQL / ローカル認証のランタイムレイアウト
- ローカル環境変数戦略
- ローカル認証戦略の現状と将来計画
- 開発者の典型的なフローとコマンド

本ドキュメントが定めないもの: 本番デプロイ、最終的な Cloud Run 構成、Web / API 内部の機能実装。

## ローカルオーケストレーション

ローカル開発スタックは [compose.local.yaml](../../compose.local.yaml) と `docker compose` を用いる。

現状 4 サービスを起動する:

- `postgres`: 実ローカル PostgreSQL
- `auth`: ローカル認証スタブサービス
- `api`: API ランタイムコンテナ（NestJS）
- `web`: Web ランタイムコンテナ（Next.js）

ローカルポート / 環境変数結線を維持しつつ、現行のリアルな API / Web ベースラインに揃えてある。これによりオーケストレーション、ポート、ヘルスチェック、ランタイム前提を検証可能に保てる。

## サービスの役割

### `postgres`

- 公式 `postgres:16-bookworm` イメージ
- データを名前付き Docker ボリュームに永続化
- 開発時のローカル PostgreSQL 挙動の真実源

### `auth`

- 現状はローカル開発用認証スタブを動かす
- Web / API が初期開発で利用するローカル認証ベース URL を露出する
- Firebase Auth 統合実装前に、認証前提を明示しておくために存在する

### `api`

- 共有ローカル Node 開発イメージを使用
- `DATABASE_URL` / 認証モード / 認証ベース URL を環境変数で受け取る
- NestJS API ベースラインを稼働
- `just dev` 中はソース変更で Nest watch モード経由で再起動する
- `/health` を公開し、Compose ヘルスチェックで NestJS 起動と PostgreSQL 接続性を検証できる

### `web`

- 共有ローカル Node 開発イメージを使用
- Issue #22 の Next.js ベースラインを Issue #106 が compose の `web` ランタイムに結線したもの
- API ベース URL と認証関連設定を環境変数で受け取る
- `/health` を公開し、Compose ヘルスチェックで Web ランタイム到達性を検証できる

## 共有ローカルイメージ

共有ローカルランタイムイメージは [docker/local/node-dev.Dockerfile](../../docker/local/node-dev.Dockerfile)。

目的:

- リポジトリ dev 環境に近い安定した Debian ベース Node ランタイムを提供する
- Corepack 経由で `pnpm` を有効化する
- ローカル compose の各サービスにサービス固有のアドホックコマンドではなく、1 つの共有ベースイメージを与える

これは本番イメージではない。

## ローカル認証戦略

2 段階。

### 現フェーズ

- `FOCUSBUDDY_AUTH_MODE=stub` を使う
- `auth` サービスはローカル認証スタブとして動かす
- Web / API は環境変数から認証モードと認証ベース URL を読む

これにより、Firebase 統合実装前でもローカル認証を明示できる。

### 計画中の次フェーズ

- Issue #30 が実装されたら、`auth` サービスをスタブから Firebase Auth エミュレータサポートに切り替える
- 同じ高位結線パターンを保ち、Web / API は依然として環境変数から認証設定を読む

つまりリポジトリは現状で managed Firebase の挙動を完全再現しないが、ローカル認証挙動も未定義のままにしない。

## ローカル環境変数戦略

最初の追跡例ファイルは [.env.example](../../.env.example)。

ローカル compose スタックは現状以下のカテゴリを期待する:

- PostgreSQL のデータベース名 / ユーザ / パスワード / ホストポート
- API / Web / Auth のホストポートマッピング
- ローカル認証モード
- Next.js Web ランタイムが見るブラウザ可視 API ベース URL

後続実装はこのルールを継続する:

- 秘密値は追跡ファイルに含めない
- 追跡された例は最小限・ローカル開発志向に保つ
- ランタイム値は machine-specific なシェル状態ではなく compose の環境設定でコンテナへ渡す
- フロントエンドランタイム変数を結線する際は、コンテナ内サービス URL とブラウザ可視 URL を区別する

API ローカル起動のランタイム契約:

- ローカルランタイム検証前に `.env` を読み込む
- 明示的な `DATABASE_URL` がある場合はそれを尊重する
- `DATABASE_URL` 不在時は、追跡された `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` と任意の `POSTGRES_PORT` から localhost PostgreSQL 接続文字列を派生させる
- 明示も派生もできない場合は、対処可能な起動エラーで fail-fast する

これにより追跡対象の設定カテゴリは安定する一方、Compose やホスト側補助起動が異なる最終ランタイムアドレスを解決できる余地が残る。

## 開発者フロー

リポジトリは以下のローカル開発ヘルパを提供する:

- `just install`
- `just openapi`
- `just prisma <migration-name>`
- `just dev`
- `just parity`
- `just dev-down`
- `just parity-down`
- `just dev-logs`
- `just parity-logs`
- `just dev-logs-running`
- `just dev-psql`

ヘルパスクリプト本体は [scripts/local-dev](../../scripts/local-dev) 配下。

日常的なフルスタックローカル開発は `just dev` から開始する。

スタックが起動済みのまま `just dev` を再実行すると、開発志向のアプリサービス（`auth` / `api` / `web`）が再起動される。これによりパッケージマニフェストや起動スクリプトの変更が PostgreSQL を再起動せずに取り込まれる。

ワークスペース依存を更新したいときは `just install` を実行する。リポジトリルートで `pnpm install` を実行し、現在動いているアプリサービスを再起動する。依存と起動の変更を PostgreSQL 再起動なしで取り込む。

OpenAPI 形状や生成クライアント可視の契約を変えたら `just openapi` を実行する。リポジトリルートで `pnpm generate` を実行し、現在動いているアプリサービスを再起動して再生成された契約出力を反映する。PostgreSQL は再起動しない。

Prisma スキーマを変えたら `just prisma <migration-name>` を実行する。API マイグレーションを適用し、Prisma クライアントを再生成し、現在動いているアプリサービスを再起動して更新スキーマ契約を反映する。PostgreSQL は再起動しない。

`pnpm dev` のような低レベルなホスト側コマンドや、アプリパッケージごとの dev コマンドは補助エスケープハッチとして残るが、第一級のフルスタックワークフローではない。

期待されるローカルフロー:

1. 上書きが必要なら [.env.example](../../.env.example) をローカルの `.env` にコピーする
2. dev container 内で作業する場合、Docker outside of Docker サポートを有効にしてコンテナを再ビルドする
3. ホストマシンに Docker がインストール・起動されていることを確認する
4. `just dev` を実行
5. 依存変更が動作中サービスにも反映されるべきときは `just install`
6. OpenAPI / 生成契約の変更がサービスに反映されるべきときは `just openapi`
7. Prisma スキーマ変更がサービスに反映されるべきときは `just prisma <migration-name>`
8. ログは `just dev-logs` で確認
9. 動作中サービスのみ追跡したいときは `just dev-logs-running`
10. PostgreSQL に接続したいときは `just dev-psql`
11. スタックを止めるときは `just dev-down`

これが現行の `fast compose` レーンであり、本リポジトリの既定フルスタックローカルワークフロー。

## パリティ compose フロー

本番志向のローカル検証用に `parity compose` レーンも提供する。

- 起動: `just parity`
- ログ: `just parity-logs`
- 停止: `just parity-down`

最初のパリティ実装は意図的に狭い:

- 依然として Compose 管理のローカル PostgreSQL とローカル認証スタブを使う
- API / Web を開発ランタイムからビルド済みランタイムコマンドに置き換える
- Compose ヘルスチェック完了を ready 報告前に待つ

このレーンの初期 must-match チェック:

- API は watch ランナーではなくビルド済み出力から起動する
- Web は `next dev` ではなく `next build` + `next start` で起動する
- API は依然として `postgres` サービスホスト名を指す明示的な Compose `DATABASE_URL` から起動する
- auth / api / web のすべてが、より厳格な起動経路下で healthy にならなければ、レーンは ready とみなさない

parity compose は fast lane と同じ公開ローカルポートを再利用するため、レーンを切り替えるときは明示的に行う:

1. fast compose を `just dev-down` で止める
2. parity compose を `just parity` で起動する
3. ログを `just parity-logs` で確認する
4. parity compose を `just parity-down` で止める
5. 検証完了後は `just dev` で既定レーンに戻る

## dev container との関係

dev container とローカル Docker compose スタックは異なる課題を解く。

- dev container は編集 / CLI 環境を整える
- ローカル compose スタックはアプリ / サービスのランタイムトポロジを整える

互換に保つが、同じレイヤではない。

dev container を Docker outside of Docker 有効で再ビルドした場合、dev container 内で実行される Docker コマンドは、コンテナ内の別 Docker デーモンではなくホストマシンの Docker エンジンを使う。

これにより、ローカル compose ワークフローは dev container 内から起動できるが、ホストマシンに Docker がインストール / 起動されていることが依然として前提となる。

compose ファイルはバインドマウントをコンテナ内 `/workspaces/...` ではなくホストファイルシステムに対して解決する必要がある。dev container は `FOCUSBUDDY_WORKSPACE_MOUNT` でホストのリポジトリパスを転送し、compose ファイルが利用可能なときにそれをバインドマウントの source として使う。

## デプロイ済みランタイムとの差分

最初のローカルスタックは意図的に本番と異なる:

- PostgreSQL は Cloud SQL ではなくローカル Docker PostgreSQL
- 認証は当面ローカルスタブで、リアル Firebase Auth やフルエミュレータではない
- Web は現行 Next.js ベースラインを配信するが、機能 UI は Issue #22 後も意図的に最小
- ローカルスタックには Secret Manager や Cloud Run 結線は無い

これらの差分が許容されるのは、ローカルワークフローを「明示的かつ再現可能」にすることが、フル機能実装より先という現段階の目的に合致するためである。

`fast compose` / `parity compose` / ホスト直接起動の差、must-match なランタイムカテゴリ、許容されるローカルドリフトの詳細は [local-execution-and-drift-policy.md](./local-execution-and-drift-policy.md) を参照する。

## 関連 Issue へのハンドオフ

- Issue #21（NestJS API ベースライン）/ #22（Next.js ベースライン）/ #106（Web ベースラインの compose 結線）/ #51（本 Docker ベース環境）はいずれも完了済み
- Issue #30 で認証スタブを Firebase Auth エミュレータサポートまたは別の確定ローカル認証機構に置き換える
- Issue #28 / #31 で、ローカル PostgreSQL と config の方針を後段の Cloud SQL / ランタイム設定ルールと整合させる
