# リポジトリ構成と OpenAPI ワークロード設計

## リポジトリ構成オプション

| 方式                                                                                                  | 利点                                                                                                        | 注意点                                                                                                       | 推奨用途                                                                                                    |
| ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| **マルチレポ** (`client-web`, `client-native`, `server-api`)                                          | コンポーネントごとの責任とリリースフローを明確化・独立化できる。リポジトリの履歴がシンプル。                | 複数リポジトリでのバージョン整合性管理が必須。共通コードは別パッケージ化が必要。                             | 運用規模が小さく、サーバーとクライアントの更新頻度が大きく異なる場合。                                      |
| **マルチパッケージ・モノレポ** (`apps/web`, `apps/native`, `apps/server`, `packages/api-client` など) | 依存の同期が容易。共通型やユーティリティを `packages/` で共有できる。CI/CD やリリースフローを一元化できる。 | モノレポ用ツール（Turborepo, Nx, pnpm workspace など）の導入が必要。ビルドキャッシュ戦略を設計する必要あり。 | サーバーとクライアントの開発・リリースを同期させたい場合。開発者が 1 名で全体を管理する場合の運用負荷軽減。 |

現状の開発体制（単独開発）とコード共有ニーズを踏まえると、**まずはモノレポで `packages/api-client` に自動生成クライアントを配置し、安定運用後にマルチレポへ切り出す**段階的アプローチが扱いやすいです。段階的に次のステップで移行できます。

1. 現リポジトリを `server-api` ベースに整理し、OpenAPI 仕様と生成クライアント (`src/generated/openapi-client`) を提供。
2. `client-web` と将来の `client-native` には, npm リンク or private npm registry (`@office-manager/api-client`) でクライアント SDK を配布。
3. 必要に応じて `packages/api-schema` などで Zod/TypeScript の共通型を公開し、フォームバリデーションやフロント側の型共有を強化。

### 推奨ディレクトリ構造 (モノレポ移行案)

```
repo/
├── apps/
│   ├── web/              # Next.js (App Router)
│   ├── native/           # Expo / React Native
│   └── server/           # Next.js API または将来的な独立サーバー
├── packages/
│   ├── api-client/       # OpenAPI 生成クライアント (npm package として管理)
│   ├── ui-kit/           # Web/Native 共通 UI コンポーネント（必要なら）
│   └── shared-types/     # Prisma スキーマ由来の Zod/TypeScript 型
├── openapi/
│   ├── openapi.yaml
│   └── ts-client-config.yaml
├── docs/
└── turbo.json / pnpm-workspace.yaml など
```

_リポジトリを分割する場合は_、`packages/api-client` を独立リポジトリ (`office-manager-api-client`) として切り出し、他リポジトリから npm 依存で参照する運用がシンプルです。

## 型共有のベストプラクティス

- **Prisma schema → Zod/TypeScript 変換**: `prisma-zod-generator` や `prisma-kysely` などで DB スキーマと API レスポンスの型を同期。生成した型を `packages/shared-types` として公開。
- **OpenAPI ベースの型生成**: 現在追加した `openapi:generate` スクリプトで生成される `.ts` を Truth Source にし、クライアント側はそれを利用。React Query/RTK Query 用のラッパは `packages/api-client` 内で提供すると Web/Native 双方で再利用しやすいです。
- **環境変数管理**: `server-api` で必要な環境変数を `.env.example` に整理し、`client-web`/`client-native` には公開可能なもののみを `NEXT_PUBLIC_*` として供給。

## CI / CD と自動化フロー

1. **PR 時**: `npm run lint`, `npm run test`, `npm run openapi:generate -- --dry-run` 等を GitHub Actions で実行し、OpenAPI 変更差分を可視化。
2. **main マージ後**: `openapi.yaml` に更新がある場合のみクライアントを再生成し、`packages/api-client` をビルドして npm (private) に publish。
3. **クライアントリポジトリ側**: Renovate または GitHub Actions を使って `@office-manager/api-client` のバージョンアップを自動 PR する。

### GitHub Actions 例 (サーバー側)

```yaml
name: Generate API Client
on:
  push:
    branches: [main]
    paths:
      - 'openapi/**'
jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: 21
      - run: npm ci
      - run: npm run openapi:generate
      - run: npm pack ./src/generated/openapi-client
      - name: Publish to GitHub Packages
        run: npm publish ./src/generated/openapi-client --access restricted
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN_OR_NPM_TOKEN }}
```

## 将来の native 対応を見据えた注意点

- **React Query / TanStack Query** ベースのフックを `packages/api-client` に含め、Web/Native で同じ API 呼び出し体験を提供。
- **ファイルアップロード**: `multipart/form-data` を扱えるように、Native 側は `expo-file-system` / `react-native-file-access` を利用し、`FormData` shim を `cross-fetch` や `formdata-node` と組み合わせる。
- **認証**: `Authorization: Bearer <token>` を共通で利用できるように、アクセストークンの保存を `expo-secure-store` (Native) と `cookie/localStorage` (Web) でラップした共通 API (`packages/api-client/auth-token-store.ts`) を用意。
- **CORS & CSRF**: Native からの呼び出しでは CORS の制約が緩いため、Origin チェックよりも JWT の署名検証と Refresh Token ローテーションを重視。Web には `Access-Control-Allow-Credentials` と `CSRF` トークン戦略を併用。

## まとめ

- 現状は単独開発のため、**モノレポでの型・クライアント共有からスタート**し、運用が複雑化した段階でマルチレポに移行するのがおすすめ。
- OpenAPI 仕様と自動生成クライアントを中心に据えることで、Web/Native 双方で同一の API コントラクトと型安全性を保証できる。
- CI/CD で OpenAPI 変更をトリガーにクライアントパッケージを自動 publish することで、将来的な開発者増加やリポジトリ分割にも対応しやすくなる。
