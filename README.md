| 項目         | サービス                 |
| ---------- | -------------------- |
| フロント/サーバー  | **Vercel** (Next.js) |
| 本番DB       | **Vercel Postgres**  |
| ファイルアップロード | **Cloudinary**       |
| ORM/DB操作   | **Prisma**           |
| 認証         | JWT                  |

# Office Manager Next.js アプリ

このリポジトリは Next.js + Prisma + JWT認証によるオフィス管理アプリです。

## 動作環境
- Node.js 18以上推奨
- macOS/Windows/Linux対応

## セットアップ手順

1. **リポジトリをクローン**

```bash
git clone <このリポジトリのURL>
cd office-manager-next
```

2. **依存パッケージをインストール**

```bash
npm install
```

3. **環境変数ファイルを作成**

`.env` ファイルをプロジェクトルートに作成し、下記を参考に設定してください。

```
NEXT_PUBLIC_API_URL=http://192.168.2.103:3000/api
NEXT_PUBLIC_URL=http://192.168.2.103:3000
DATABASE_URL="file:./dev.db"
```
- `NEXT_PUBLIC_API_URL` はLANアクセス時は `http://<あなたのIPアドレス>:3000/api` などに変更してください。
- `NEXT_PUBLIC_URL` はパスワード再設定メールのリンク生成などで使うため、**必ず自分の環境に合わせて追加・設定してください**。

4. **PrismaのDBマイグレーション（初回のみ）**

```bash
npx prisma migrate dev --name init
```

5. **Prisma Clientの生成（必要に応じて）**

Prismaのスキーマやマイグレーションを変更した場合は、下記コマンドでPrisma Clientを再生成してください。

```bash
npx prisma generate
```

6. **開発サーバーを起動**

```bash
npm run dev
```

7. **アプリにアクセス**

- [http://<あなたのIPアドレス>:3000](http://<あなたのIPアドレス>:3000) でアクセスできます。
- 他端末からアクセスする場合も `http://<あなたのIPアドレス>:3000` でアクセスしてください。

## 注意事項
- 画像アップロードは `public/uploads/` ディレクトリに保存されます（初回アップロード時に自動生成されます）。
- `prisma/dev.db` などのDBファイルは `.gitignore` で管理対象外です。
- 本番運用時は `.env` の値やDBのバックアップ等にご注意ください。

## Prisma Studio
Prisma Studioは、Prismaを使用しているプロジェクトのためのビジュアルデータブラウザです。次のコマンドで起動できます。

```bash
npx prisma studio
```

これにより、ブラウザでデータベースの内容を視覚的に確認・編集できるインターフェースが開きます。

## セキュリティ・機密情報の管理について

- `.env`ファイルにはSMTP_PASSなどの機密情報（メール送信用パスワード等）が含まれます。
- `.env`は**絶対にGit管理（リポジトリへのコミットや公開）をしないでください**。
- 開発チーム内では、`.env.example`などのサンプルファイルのみ共有し、実際の値は各自がローカルで設定してください。
- 機密情報の共有が必要な場合は、パスワード管理ツールや安全なDM等で個別に共有してください。
- 万が一漏洩した場合は、Googleアカウントの「アプリパスワード」をすぐに無効化・再発行してください。

### アプリパスワードの発行方法
- Googleアカウントの「アプリパスワード」発行ページ: https://myaccount.google.com/apppasswords
- 2段階認証を有効にした上で、上記リンクからアプリパスワードを発行してください。

### 参考: .envの例
```
NEXT_PUBLIC_API_URL=http://<IPアドレス>:3000/api
NEXT_PUBLIC_URL=http://<IPアドレス>:3000
DATABASE_URL="file:./dev.db"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=youraddress@gmail.com
SMTP_PASS=（アプリパスワード）
SMTP_FROM=youraddress@gmail.com
```

> SMTP_PASSは他人に絶対に教えないでください。漏洩すると第三者にメール送信される危険があります。

