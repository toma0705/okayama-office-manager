/**
 * 結合テストの準備。本物の DB を空にしながら使うので、ローカルの DB 以外では実行しない。
 */
const host = (() => {
  try {
    return new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    return '';
  }
})();
if (!['localhost', '127.0.0.1'].includes(host)) {
  throw new Error(
    `結合テストはローカルの DB でだけ実行できます（DATABASE_URL: ${host || '未設定'}）`,
  );
}

process.env.JWT_SECRET = 'integration-test-secret';
// Discord には送らない（fetch はテストごとに差し替える）
process.env.DISCORD_WEBHOOK_URL_DEFAULT = 'https://discord.test/webhook';
delete process.env.DISCORD_WEBHOOK_URL_OKAYAMA;
