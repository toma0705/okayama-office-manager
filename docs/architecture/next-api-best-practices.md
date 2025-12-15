# Next.js API を Web / Native 双方から利用する際のベストプラクティス

## 認証・セッション管理

- **JWT + Refresh トークン戦略**: 現状の `/users/login` で発行しているアクセストークンに加え、長寿命の refresh token を `HttpOnly` クッキーで発行すると Web での自動リフレッシュが簡単になります。Native では SecureStore 等に保存し、同じ更新 API を利用。
- **Authorized Next middleware**: `middleware.ts` で API へのリクエストに対して JWT ヘッダー検証を行い、共通の 401 レスポンス整形とロギングを実装。
- **型安全なトークン Payload**: `@/types/declaration` に含まれる `JwtPayload` を OpenAPI の `components.schemas` に反映し、クライアントでも型安全に取り扱う。

## CORS 設定

- **フロントエンドの Origin ホワイトリスト**: `NextResponse.next()` 前に `Access-Control-Allow-Origin` を指定。Native からの呼び出しは `fetch` 内で `mode: 'cors'` を指定し、`Access-Control-Allow-Credentials` の有無で cookie ベースかヘッダーベースかを切り替える。
- **OPTIONS プレフライトの共通処理**: `route.ts` ごとに実装するのではなく、`src/lib/cors.ts` にヘルパーを定義し、`if (req.method === 'OPTIONS') return corsPreflight()` とする。

## 画像アップロード

- **ファイルサイズ上限**: 現状の `MAX_ICON_SIZE_BYTES` を OpenAPI に記載済み。Native では `ImageManipulator` などで事前圧縮し、アップロード時に `fetch` + `FormData` で送信できるようにする。
- **ストレージ抽象化**: `uploadUserIcon` は Web/Native に依存しないので、API クライアントに `uploadUserIcon(formData)` のようなヘルパーを追加し、クライアントは `File` / `Blob` のラッパを提供するだけにする。

## エラーハンドリング

- **統一レスポンス構造**: `ErrorResponse` を全エンドポイントで利用し、OpenAPI とサーバー実装の型を一致させる。例: `{ error: string; detail?: string }`。
- **HTTP ステータスの標準化**: バリデーションエラー 400, 認証 401, 認可 403, 重複 409, サーバーエラー 500 といった形で Response を OpenAPI 上の `responses` と同期。

## ロギング・監視

- **監査ログ**: Discord Webhook への通知だけでなく、`POST /notify` の呼び出しを Prisma に保存する、または Cloud Logging に残すと Native クライアントからのトラブルシュートが容易。
- **ヘルスチェック**: `GET/HEAD /warmup` を Cloud Run や Vercel のヘルスチェックに利用する。Native アプリ初回起動時にも叩き、初期化遅延を回避。

## API バージョニング

- **URL バージョン**: 将来的な破壊的変更に備え `/api/v1/...` に移行する計画を立て、OpenAPI の `servers` にもバージョンを追加。
- **互換性レイヤー**: Web/Native に新旧 API が混在する期間は `Accept-Version` ヘッダーで切り替えるアプローチも検討。

## 開発フロー

1. Prisma schema / ロジックの変更 → テスト更新 (`npm test`)。
2. OpenAPI を更新 (`openapi/openapi.yaml`) → `npm run openapi:generate`。
3. 生成クライアントの型差分を確認し、クライアント側に反映。
4. GitHub Actions で自動生成 + npm publish。

## 依存管理

- Web/Native 双方で使う API クライアントは **ESM + Tree Shakeable** な形で配布し、`fetch` の polyfill (`cross-fetch`) を同梱。
- Native 向けには `react-native-url-polyfill` を peer dependency にすることで互換性を確保。

これらをベースに、OpenAPI をソースオブトゥルースとした型安全なバックエンド運用を構築できます。
