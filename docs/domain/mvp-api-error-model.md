# MVP API エラーモデル

本ドキュメントは Issue #73 の成果物である。

目的は、FocusBuddy における最初の共有 API・ドメインエラーモデルを定義することである。

本ドキュメントは [mvp-domain-model.md](mvp-domain-model.md)、[mvp-visibility-rules.md](mvp-visibility-rules.md)、[mvp-stamp-and-summary-rules.md](mvp-stamp-and-summary-rules.md) の上に成り立つ。

## スコープ

本ドキュメントが定めるもの:

- FocusBuddy における最初の安定した公開エラー分類
- `packages/api-contract` / `apps/api` / アプリ固有 UI ハンドリングの所有権境界
- 最初の生成クライアント向けエラー応答形状
- 公開可とすべき詳細と内部専用とすべき詳細の境界
- ランタイム例外をどう公開エラーコードに正規化するか
- クライアントが依拠できる retryability の意味

本ドキュメントが定めないもの: 最終的な Web リダイレクト挙動、最終的な NestJS フィルタ実装、ローカライゼーション、モバイル特有の表現。

## 所有権の分割

最初の所有権境界は明示的に保つ。

| 領域                    | 所有                                                                                                                                | 所有しない                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/api-contract` | 公開エラーコード、公開エラー応答スキーマ、生成クライアント可視の型、安定したバリデーション / コンフリクト詳細形状                  | NestJS フィルタ、Prisma / プロバイダ例外マッピング、UI コピー       |
| `apps/api`              | ランタイム例外の正規化、HTTP ステータスマッピング、request ID 付与、内部診断、サーバロギングメタデータ                              | 公開契約の正典としての所有、Web 表現の挙動                          |
| `apps/web`              | リダイレクトポリシー、インラインエラーフィードバック、リトライプロンプト、トースト挙動、ErrorBoundary 描画                          | 正典のエラーコード、サーバ HTTP マッピング、内部診断                |

実務ルールは単純である:

- `packages/api-contract` は公開語彙を所有する
- `apps/api` は内部失敗をその語彙にどうマップするかを所有する
- `apps/web` はプロダクトがその公開語彙にどう反応するかを所有する

## 公開エラー応答の原則

最初の共有エラー契約は、トップレベル形を小さく安定に保つ。

すべての公開エラー応答に必須のトップレベルフィールド:

- `code`
- `message`
- `requestId`
- `retryable`

公開エラー応答は、クライアントが安全に使える安定した型付きデータがあるときに限り、任意の `details` を含めてよい。

クライアント側の基本ハンドリングルール:

- `code` / `message` / `requestId` / `retryable` は既定挙動として常に十分でなければならない
- `details` は任意であり、クライアントが安全に使える安定した型付きデータがあるときのみ含める

## retryable の意味

生成クライアントの利用において、`retryable` の意味は次のとおりとする:

- 入力修正なしに即時リトライを提示してよい
- 認証コンテキスト変更なしに即時リトライを提示してよい

つまり、ほとんどの validation / 認証 / 認可 / ドメインルール失敗は既定で retryable ではない。

## 最低限の安定した公開エラーコード集合

| コード                     | カテゴリ                                                       | 既定 HTTP | retryable | 典型的状況                                                                   |
| -------------------------- | -------------------------------------------------------------- | --------- | --------- | ---------------------------------------------------------------------------- |
| `VALIDATION_ERROR`         | リクエストバリデーション                                       | `400`     | `false`   | 必須入力欠如、不正ペイロード、不正 enum                                      |
| `AUTH_REQUIRED`            | 認証                                                           | `401`     | `false`   | 認証欠如、期限切れ、無効トークン                                             |
| `ACCESS_DENIED`            | 認可                                                           | `403`     | `false`   | 認証済みユーザに当該アクションの権限がない                                   |
| `RESOURCE_NOT_FOUND`       | 存在 / 秘匿性保持                                              | `404`     | `false`   | 対象 / セッション / サマリ / スタンプを開示すべきでない、または存在しない |
| `INVALID_STATE_TRANSITION` | 状態遷移失敗                                                   | `409`     | `false`   | 不正な公開 / 非公開ステップ、不正な可視性遷移                               |
| `DOMAIN_RULE_VIOLATION`    | ドメイン不変条件失敗                                           | `409`     | `false`   | ノート可視性がセッション可視性を超える、サマリ前提条件が満たされない        |
| `DUPLICATE_RESOURCE`       | 一意性コンフリクト（明示的な冪等 API 以外）                     | `409`     | `false`   | 一意でなければならないリソース / 関係の重複作成                              |
| `RATE_LIMITED`             | スロットリング / 濫用防止                                      | `429`     | `true`    | 連続したスタンプ操作、ミューテーション試行過多                              |
| `UPSTREAM_UNAVAILABLE`     | 依存先障害                                                     | `503`     | `true`    | 認証プロバイダ障害、下流サービス停止                                         |
| `INTERNAL_ERROR`           | 想定外サーバ失敗                                               | `500`     | `false`   | 未捕捉ランタイム、未マップな永続化エラー                                     |

## 可視性関連の失敗

可視性関連の失敗では、公開セマンティクスと内部診断を分離する。

つまり:

- 公開読み取り面では、存在を開示すべきでないリソースを `RESOURCE_NOT_FOUND` に潰してよい
- 既知のリソースや所有者スコープ操作の失敗は、`ACCESS_DENIED` / `INVALID_STATE_TRANSITION` / `DOMAIN_RULE_VIOLATION` などより具体的な公開コードを保つ
- サーバは公開 `RESOURCE_NOT_FOUND` を返した内部理由を常に記録する
- クライアントは内部理由ではなく公開コードのみで分岐する

経験則:

- 呼び出し側にリソース存在を学ばせるべきでないなら `RESOURCE_NOT_FOUND` を返す
- 呼び出し側がリソース存在を既知でアクションを阻まれているなら `ACCESS_DENIED` を返す
- 所有者だが現状態 / 可視性ルールでアクションが拒まれるなら `INVALID_STATE_TRANSITION` または `DOMAIN_RULE_VIOLATION` を返す

## 「役立った」スタンプのセマンティクス

エラーモデルは [mvp-stamp-and-summary-rules.md](mvp-stamp-and-summary-rules.md) の冪等な「役立った」スタンプルールを保つ。

つまり:

- 「役立った」スタンプの有効化は冪等とする
- 同一の有効化アクションを繰り返しても、状態を変えずに success を返す
- 「役立った」スタンプの解除は明示的な remove 操作であり、create の暗黙取り消しではない
- 既に有効な「役立った」スタンプの再有効化は `DUPLICATE_RESOURCE` を返さない

これは重複送信ハンドリングと意図的なユーザ反転を分離する。

## 公開コンフリクト理由語彙

`ConflictErrorDetails.reason` は最初は小さな公開 enum とし、自由文字列にしない。

最初の公開コンフリクト理由:

| 公開理由                              | 典型的な公開コード         | 意味                                                                       |
| ------------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| `INVALID_VISIBILITY_TRANSITION`       | `INVALID_STATE_TRANSITION` | 要求された可視性変更が現状態から許容されない                              |
| `SUMMARY_PREREQUISITE_NOT_MET`        | `INVALID_STATE_TRANSITION` | サマリ公開の前提条件が満たされない                                        |
| `NOTE_VISIBILITY_EXCEEDS_SESSION`     | `DOMAIN_RULE_VIOLATION`    | ノート可視性要求がセッション可視性を超える                                |
| `RESOURCE_ALREADY_EXISTS`             | `DUPLICATE_RESOURCE`       | 一意でなければならないリソース / 関係の作成を試みた                       |

つまり:

- 公開契約は安定したコンフリクト系 reason enum を所有する
- `apps/api` はより豊富な内部理由を保持し、それを公開 enum へ正規化してよい
- 生 Prisma メッセージ、プロバイダコード、スタックトレースは内部専用に留める
- 内部コンフリクトを公開 enum に確信を持ってマップできない場合、`reason` を省略しつつ広い公開 `code` を返してよい

## 公開と内部の詳細境界

公開応答に含めてよいもの:

- 安定したエラーコード
- 安全な既定メッセージ
- リクエスト相関 ID
- retryability
- 該当時のフィールドレベルバリデーション詳細
- 公開可なコンフリクトやクールダウンメタデータ

公開応答に含めてはならないもの:

- 生のデータベース / プロバイダエラー
- 公開契約としての Prisma エラーコード
- スタックトレース
- 認証プロバイダの内部
- 非開示リソース存在を露呈する認可説明
- クライアントに意味の無い空っぽな `details`
- `HIDDEN_BY_TARGET_VISIBILITY` のような内部診断理由

## 内部専用診断

最初のサーバ側診断モデルは、以下の内部専用フィールドを強く検討する:

- `requestId`
- `publicCode`
- `internalReason`
- `actorContext`
- `resourceType`
- `resourceId`

これらはログと可観測性を改善するが、既定で公開契約の一部にはしない。

## バックエンドの正規化フロー

バックエンドはフレームワーク / 永続化の例外を直接公開せず、段階を踏んで正規化する。

### Stage 1: 生失敗の捕捉

API 境界でバリデーション、認証、ドメインサービス、リポジトリ、インフラクライアント、未捕捉ランタイムからの生失敗を捕捉する。

### Stage 2: 内部理由の分類

生失敗を内部診断理由にマップし、必要に応じてアクタ / リソース文脈を付ける。

### Stage 3: 公開コードと公開理由へのマップ

内部理由を以下に変換する:

- `publicCode`
- 任意の公開 `ConflictReason`
- `retryable`
- 安全な top-level `message`
- 任意の公開 `details`

### Stage 4: 診断書き込み

応答送信前に、リクエストと内部分類文脈をログに残す。

### Stage 5: 公開応答の発行

API は公開契約フィールドのみを返す。

生のデータベースメッセージ、プロバイダ詳細、スタックトレースは決して境界を越えさせない。

## ドメインマッピング例

| 状況                                                                                       | 公開結果                                                          | 備考                                                                       |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 公開面で非公開セッションを表示しようとした                                                 | `RESOURCE_NOT_FOUND`                                              | 明示的開示より秘匿を優先                                                  |
| 公開面でノート可視性が許さないノート内容を露出しようとした                                 | `RESOURCE_NOT_FOUND`                                              | 外部には存在を隠せる。ログに内部理由を残す                                |
| 所有者フローでセッション可視性を超えるノート内容を露出しようとした                         | `DOMAIN_RULE_VIOLATION` + `NOTE_VISIBILITY_EXCEEDS_SESSION`       | 復帰可能なビジネスルール失敗                                              |
| 前提条件を満たさず公開サマリを有効化しようとした                                           | `INVALID_STATE_TRANSITION` + `SUMMARY_PREREQUISITE_NOT_MET`       | アクションが集約状態と競合                                                |
| 他ユーザに属する可視ターゲットを変更しようとした                                           | `ACCESS_DENIED`                                                   | リソースは可視だが操作は禁止                                              |
| 既に有効な「役立った」スタンプの有効化を繰り返した                                         | success no-op                                                     | 状態変化のない冪等成功                                                    |
| 既に無効 / 未存在の「役立った」スタンプを解除しようとした                                  | success no-op または冪等 remove                                   | 空状態のペイロード詳細は実装に委ねてよい                                  |

## OpenAPI 寄りの応答モデル

Issue #20 でのコード生成を実用的に保つため、エラー契約は大きなインライン応答スキーマよりも名前付き再利用コンポーネントを優先する。

最初の契約で強く検討するスキーマコンポーネント:

- `ErrorCode`
- `ConflictReason`
- `ErrorResponseBase`
- `ValidationIssue`
- `ValidationErrorDetails`
- `ConflictErrorDetails`
- `RateLimitErrorDetails`
- `ValidationErrorResponse`
- `UnauthorizedErrorResponse`
- `ForbiddenErrorResponse`
- `NotFoundErrorResponse`
- `ConflictErrorResponse`
- `RateLimitErrorResponse`
- `ServiceUnavailableErrorResponse`
- `InternalErrorResponse`

最初の契約で強く検討する response コンポーネント:

- `BadRequestError`
- `UnauthorizedError`
- `ForbiddenError`
- `NotFoundError`
- `ConflictError`
- `TooManyRequestsError`
- `ServiceUnavailableError`
- `InternalServerError`

## ドラフトスキーマ片

```yaml
components:
  schemas:
    ErrorCode:
      type: string
      enum:
        - VALIDATION_ERROR
        - AUTH_REQUIRED
        - ACCESS_DENIED
        - RESOURCE_NOT_FOUND
        - INVALID_STATE_TRANSITION
        - DOMAIN_RULE_VIOLATION
        - DUPLICATE_RESOURCE
        - RATE_LIMITED
        - UPSTREAM_UNAVAILABLE
        - INTERNAL_ERROR

    ConflictReason:
      type: string
      enum:
        - INVALID_VISIBILITY_TRANSITION
        - SUMMARY_PREREQUISITE_NOT_MET
        - NOTE_VISIBILITY_EXCEEDS_SESSION
        - RESOURCE_ALREADY_EXISTS

    ErrorResponseBase:
      type: object
      additionalProperties: false
      required:
        - code
        - message
        - requestId
        - retryable
      properties:
        code:
          $ref: '#/components/schemas/ErrorCode'
        message:
          type: string
        requestId:
          type: string
        retryable:
          type: boolean
        details:
          oneOf:
            - $ref: '#/components/schemas/ValidationErrorDetails'
            - $ref: '#/components/schemas/ConflictErrorDetails'
            - $ref: '#/components/schemas/RateLimitErrorDetails'

    ValidationErrorDetails:
      type: object
      additionalProperties: false
      required:
        - kind
        - issues
      properties:
        kind:
          type: string
          enum:
            - validation
        issues:
          type: array
          items:
            $ref: '#/components/schemas/ValidationIssue'

    ConflictErrorDetails:
      type: object
      additionalProperties: false
      required:
        - kind
      properties:
        kind:
          type: string
          enum:
            - conflict
        reason:
          $ref: '#/components/schemas/ConflictReason'
        currentState:
          type: string

    RateLimitErrorDetails:
      type: object
      additionalProperties: false
      required:
        - kind
      properties:
        kind:
          type: string
          enum:
            - rate_limit
        retryAfterSeconds:
          type: integer
          minimum: 0
        scope:
          type: string
```

主要な設計選択:

- 共通の `ErrorResponseBase` を使い、生成クライアントが常に同一のトップレベルを受け取る
- `code` を機械可読でランタイム実装間に安定とする
- `details` は契約レベルで任意とし、安定した型付きクライアント価値があるときのみ含める
- 3 つの `409` コードに `ConflictErrorResponse` を使い、`code` で細かなビジネス区分を担う
- 明示的な冪等 API はコンフリクト系から外す

## 後続作業との関係

### Issue #20 向け

本ドキュメントは、最初の OpenAPI エラーコンポーネントと生成クライアント可視の型を駆動するに十分な具体性を持つ。

### Issue #21 向け

本ドキュメントは契約境界を定義する。具体的な NestJS フィルタ、Prisma 正規化、ランタイム実装詳細は API 実装作業の側に属する。

### Issue #74 向け

本ドキュメントは共有公開エラー語彙を所有する。

Issue #74 は、それらのエラーカテゴリに対する Web プロダクトの応答方法（リダイレクト、インライン復旧、リトライプロンプト、フォールバック挙動）を所有する。

## カバレッジの完了状態

本ドキュメントは以下を明示的にした:

- 契約作業が依拠できる公開エラーカテゴリ
- `packages/api-contract` / `apps/api` / `apps/web` の所有権分割
- 最低限の安定した公開エラーコード集合
- 生成クライアント向け応答形状
- 公開詳細と内部診断の境界線
