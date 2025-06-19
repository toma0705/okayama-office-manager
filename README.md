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
DATABASE_URL="file:./dev.db"
```
- `NEXT_PUBLIC_API_URL` はLANアクセス時は `http://<あなたのIPアドレス>:3000/api` などに変更してください。

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

