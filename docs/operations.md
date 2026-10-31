# 運用の手順

本番で動いているもの・定期的に必要な作業・困ったときの手順です。
アカウントの持ち主や秘密の値の置き場所は、公開リポジトリには書かず、非公開の引き継ぎ資料にまとめています。

## 本番の構成

| もの             | 場所                                          | メモ                                                                            |
| ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| Web・API         | Vercel（プロジェクト okayama-office-manager） | https://okayama-office-manager.vercel.app 。main にマージすると自動で本番に反映 |
| DB               | Prisma Postgres（Prisma Data Platform）       | `DATABASE_URL` は `prisma+postgres://accelerate.prisma-data.net/...`            |
| プロフィール画像 | Cloudflare R2                                 | `R2_*` の環境変数                                                               |
| 定期実行         | cron-job.org                                  | 下の 2 つのジョブ                                                               |
| 通知             | Discord の Webhook                            | オフィスごと。`DISCORD_WEBHOOK_URL_<コード>`                                    |
| メール           | SMTP（`SMTP_*`）                              | パスワード再設定                                                                |

環境変数の一覧は [README の「環境変数」](../README.md#環境変数) にあります。

## 定期実行（cron-job.org）

Vercel の無料プランの定期実行は 1 日 1 回までなので、cron-job.org から API を呼んでいます。
どちらのジョブも、ヘッダーに `Authorization: Bearer <CRON_SECRET>` を付けます（`CRON_SECRET` は Vercel の環境変数と同じ値）。

| ジョブ             | URL                              | タイミング              | 内容                                                                |
| ------------------ | -------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| 入退室の保留の確定 | `GET /api/cron/finalize-exits`   | 毎分                    | 1 分経った入室の保留・15 分経った退室の保留を確定し、Discord に通知 |
| 一括退室           | `GET /api/cron/nightly-checkout` | 毎日 4:00（Asia/Tokyo） | 入室中の全員を退室にする（通知しない）                              |

- 応答はそれぞれ `{"entered":1,"exited":0}`、`{"checkedOut":3}` のような人数です。cron-job.org の実行履歴で確かめられます。
- **一括退室のジョブで「TEST RUN」を押すと、その場で全員が退室になります。** 日中は押さないでください。
- 毎分のジョブが止まっていても、だれかが画面を開けば `/api/users/me` が保留を確定します（通知が遅れるだけ）。

`CRON_SECRET` を変えるときは、Vercel の環境変数と cron-job.org の 2 つのジョブのヘッダーを両方変えます。

## DB のマイグレーション

ビルド（Vercel）ではマイグレーションを実行しません。スキーマを変える PR は、**マージの前に**本番に適用します。

```bash
DATABASE_URL='<本番の DATABASE_URL>' npx prisma migrate deploy
```

- **列やテーブルを足す**とき: 先に適用 → マージ。古いコードは新しい列を使わないので、先に適用しても困りません。
- **列やテーブルを消す**とき: その列を使わないコードを先にマージ（本番に反映）→ 適用。逆にすると、古いコードが消えた列を読みに行ってエラーになります。
- 適用の状態は `npx prisma migrate status` で確かめられます。

CI は、マイグレーションが空の DB に適用できるか、`schema.prisma` と一致しているかを確かめています。

## API クライアント（api-client）の自動更新

`openapi/openapi.yaml` を変えて main にマージすると、GitHub Actions（[.github/workflows/api-client.yml](../.github/workflows/api-client.yml)）が [office-manager-api-client](https://github.com/toma0705/office-manager-api-client) に PR を作ります。
そのために、api-client に書き込めるトークンを、このリポジトリのシークレット `API_CLIENT_TOKEN` に登録しておく必要があります。

### トークンの作り方・登録の仕方

1. GitHub の Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. 設定
   - Repository access: **Only select repositories** → `office-manager-api-client` だけ
   - Permissions（Repository permissions）: **Contents: Read and write**、**Pull requests: Read and write**
   - Expiration: 長めに（期限が切れたら作り直して登録し直す）
3. このリポジトリ（okayama-office-manager）の Settings → Secrets and variables → Actions → New repository secret
   - Name: `API_CLIENT_TOKEN`、Secret: 作ったトークン
4. Actions タブの「API クライアントの更新」→ Run workflow で動くか確かめる（変更がなければ PR は作られない）

トークンが未登録・期限切れのときは、このワークフローが「API_CLIENT_TOKEN が未登録です」などで失敗します。

## オフィスを増やす

1. DB の `Office` テーブルに行を足す（`code` は英大文字。例: `OSAKA`）。Prisma Studio（`npx prisma studio`）を本番の `DATABASE_URL` で開くか、SQL で入れる
2. Discord の通知先を分けるなら、Vercel に `DISCORD_WEBHOOK_URL_OSAKA` を足して再デプロイ（なければ `DISCORD_WEBHOOK_URL_DEFAULT` に送る）
3. ビーコンで自動入退室するなら、アプリ側にビーコンの設定を足してアプリを出し直す（native の README の「オフィスのビーコンを増やす」）

## 秘密の値を変える

| 値                                   | 変えたときの影響                                                         |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `JWT_SECRET`                         | 全員のログインが切れる（アプリの自動入退室も、ログインし直すまで止まる） |
| `CRON_SECRET`                        | cron-job.org の 2 つのジョブのヘッダーも変える                           |
| `DATABASE_URL`（Prisma の API キー） | Vercel を更新して再デプロイ                                              |
| Discord の Webhook                   | Webhook を作り直したら Vercel を更新して再デプロイ                       |

Vercel の環境変数を変えたら、再デプロイ（Deployments → 最新の … → Redeploy）しないと反映されません。

## 困ったとき

- **だれかが何日も入室中のまま**: 毎日 4:00 の一括退室で消えます。すぐ消したいときは、Web で本人が退室ボタンを押すか、DB の `entered` を false にします。
- **Discord に通知が来ない**: Vercel の Logs で `Discord への通知に失敗しました` を探す。Webhook の URL が消されていないか確かめる。
- **入退室の保留が確定しない**: cron-job.org の実行履歴で、毎分のジョブが 200 を返しているか確かめる（401 なら `CRON_SECRET` が違う）。
- **本番だけで起きる不具合**: Vercel の Logs を見る。500 の応答には詳細を含めていないので、`console.error` の出力で原因を見る。
