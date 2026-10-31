# 引き継ぎ資料（入退室管理アプリ）

このアプリを引き継ぐ人が、最初に読む資料です。全体像・最初にやること・定期的に必要な作業・既知の課題をまとめています。
アカウントの持ち主や秘密の値の置き場所は、公開リポジトリには書かず、前任者から共有される**非公開の引き継ぎ資料**にまとめています。

## このアプリでできること

- オフィスに「今だれがいるか」を、アプリ・Web・Discord で確認できる
- アプリを入れておくと、オフィスのビーコン（ESP32）を検知して**自動で入退室**を記録する
- 入退室のたびに、そのときの在室状況を添えて Discord に通知する
- Web からは手動で入退室できる。メモ（「〜時まで作業中」など）も残せる

## 全体像

| リポジトリ                                                                          | 内容                            | 公開のされ方                                          |
| ----------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| [okayama-office-manager](https://github.com/toma0705/okayama-office-manager)（web） | Web の画面と API（Next.js）     | main にマージすると Vercel が自動で本番に反映         |
| [office-manager-native](https://github.com/toma0705/office-manager-native)          | iOS・Android アプリ（Expo）     | 手元でビルドして App Store / Google Play に提出       |
| [office-manager-api-client](https://github.com/toma0705/office-manager-api-client)  | アプリが API を呼ぶクライアント | web の OpenAPI 仕様から自動生成。タグでバージョン管理 |

外部のサービス: Vercel（Web・API）、Prisma Postgres（DB）、Cloudflare R2（画像）、cron-job.org（定期実行）、Discord（通知）、App Store Connect、Google Play Console。
詳しくは [operations.md](operations.md)。

### 自動入退室の流れ

```
ビーコンの圏内になる
  → アプリ（iOS は JS、Android はネイティブ）が /api/users/{id}/arrive を呼ぶ
  → サーバーが「入室の保留」にする
  → 1 分のあいだ圏外にならなければ、cron-job.org の毎分のジョブが入室を確定 → Discord に通知
ビーコンの圏外になる
  → アプリが /api/users/{id}/leave を呼ぶ → サーバーが「退室の保留」にする
  → 15 分のあいだ戻らなければ退室を確定 → Discord に通知（戻れば取り消し）
毎日 4:00 → 入室中のまま残っている人を全員退室にする（通知しない）
```

どの API を呼ぶかの判定は、iOS（`native/src/services/beacon/attendanceDecision.ts`）と Android（`AttendanceDecision.kt`）に同じものがあり、どちらも同じ表（`native/modules/office-beacon/test-fixtures/attendance-decisions.json`）でテストしています。

## 最初にやること

### アクセス権をもらう（前任者に依頼）

非公開の引き継ぎ資料の一覧を見ながら、次の権限をもらいます。

- [ ] GitHub の 3 つのリポジトリ（Admin か、少なくとも Write）
- [ ] Vercel のプロジェクト
- [ ] Prisma Data Platform（DB）
- [ ] Cloudflare（R2）
- [ ] cron-job.org
- [ ] Discord サーバーの Webhook の管理
- [ ] App Store Connect（Apple Developer Program のチーム）
- [ ] Google Play Console
- [ ] Android のアップロード鍵（keystore）とそのパスワード（なくすとアプリを更新できなくなる）

### 手元で動かす

1. web: [README の「開発を始める」](../README.md#開発を始める)。`npm test` と `npm run test:integration` が通ることを確かめる
2. native: [native の README](https://github.com/toma0705/office-manager-native#開発を始める)。シミュレーターで起動し、ローカルの web にログインできることを確かめる
3. 小さな変更で PR を作り、CI が通ってマージできるところまでやってみる

### コードを読む順番

1. `web/src/lib/attendance.ts` … 入退室の状態と保留（このアプリの中心）
2. `web/src/lib/http.ts` と `web/src/app/api/users/[id]/arrive/route.ts` … API ルートの書き方
3. `native/src/services/backgroundBeacon.ts` と `native/src/services/beacon/` … アプリ側の自動入退室
4. `native/modules/office-beacon/` … iOS（Swift）・Android（Kotlin）のビーコン検知
5. 各リポジトリの `__tests__` … 何が確かめられているか

## 決まりごと

- main に直接 push しない。PR を作り、CI が通ってからマージする（main は CI が通らないとマージできないよう保護している）
- 1 つの PR では 1 つのことだけ変える。挙動を変えるときは PR の本文に書く
- API を変えたら `openapi/openapi.yaml` も直す（テストが確かめる）
- DB を変える PR は、マージの前に本番に `prisma migrate deploy` する（[operations.md](operations.md#db-のマイグレーション)）
- 秘密の値（トークン・パスワード・API キー）をリポジトリに入れない。3 つとも**公開リポジトリ**です

## 定期的に必要な作業

| いつ             | 作業                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 毎年             | Apple Developer Program の更新（切れると App Store から消える）                                                              |
| 毎年（8 月ごろ） | Google Play が求める targetSdkVersion に上げる（`native/app.config.js` の `expo-build-properties`）                          |
| 年に 1 回くらい  | Expo SDK を上げる（`npx expo install expo@latest` → `npx expo install --fix`）。古い SDK は新しい Xcode でビルドできなくなる |
| 依存の更新       | web は `npm outdated`、native は `npx expo install --check`。上げたら CI とシミュレーターで確かめる                          |
| トークンの期限   | `API_CLIENT_TOKEN`（api-client の自動更新）は期限が切れたら作り直す                                                          |
| 気づいたとき     | cron-job.org の実行履歴で、毎分のジョブが失敗していないか見る                                                                |

ログイン用のトークンは 180 日で切れます。切れたユーザーはアプリでログインし直すまで自動入退室が止まります。

## アプリのリリース

Web と API は main へのマージで自動的に本番に出ます。アプリ（iOS・Android）は手元でビルドして提出します。手順は [native の README の「リリース」](https://github.com/toma0705/office-manager-native#リリース)。

- **API を変えるときは、古いアプリでも動くようにする**。ストアのアプリは、全員がすぐに更新するわけではありません
- アプリより先に、API（web）を本番に出す

## 知っておきたい仕様

- 登録できるメールアドレスは `@4nonome.com` だけ（`web/src/lib/constants.ts`）
- アプリは起動時に Face ID などで本人か確かめ、失敗・キャンセル・端末が非対応なら、保存しているログインを消してログイン画面に戻る
- アプリのログインでは、パスワードの前後の空白を取り除く
- アプリの「テストモード」（`OFFICE_MANAGER_TEST_MODE=1` でビルド）は、検知と記録の結果を端末に通知する（Android のみ）。入退室の確定はサーバーが行うので、Discord にも通知される
- パスワードの再設定は、メールのリンクから Web の画面で行う（アプリには画面がない）

## 既知の課題・改善のアイデア

優先度の高いものから並べています。

- **ログイン用トークンの保存場所**: アプリはトークンを AsyncStorage（暗号化なし）に保存している。SecureStore（`AFTER_FIRST_UNLOCK`）に移すと安全。バックグラウンドで読めるよう `WHEN_UNLOCKED` にはしない
- **iOS でアプリが終了しているときの検知**: SceneDelegate の設定（`native/plugins/withSceneLifecycle.js`）にしてから、OS がバックグラウンドで起こしたときに JS が動くかを実機で確かめていない。動かない場合は、アプリを開いたときにまとめて反映される
- **トークンの期限切れに気づけない**: バックグラウンドの API が 401 になっても利用者に知らせていない
- **パスワード再設定とアカウント削除で、発行済みのトークンが無効にならない**
- **新規登録のメールアドレスを確かめていない**（だれでも @4nonome.com のアドレスを名乗れる）。ログイン・登録の回数制限もない
- **スプラッシュ画面の画像**が Expo の初期のまま（`native/assets/splash-icon.png`）
- **Expo のパッチ版の更新**（`npx expo-doctor` が案内する）
- Web のログインはパスワードの前後の空白を取り除くが、Web の新規登録は取り除かない（アプリはどちらも取り除く）
