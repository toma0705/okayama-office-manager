/**
 * ローカルの DB にだけ実行するコマンドの入口（本番の DB を誤って書き換えないため）
 *   node scripts/db-local.mjs seed   … prisma/seed.sql を入れる
 * DATABASE_URL が localhost / 127.0.0.1 以外なら何もせず終了する。
 */
import { execFileSync } from 'node:child_process';

const url = process.env.DATABASE_URL ?? '';
let host = '';
try {
  host = new URL(url).hostname;
} catch {
  // 下で止める
}
if (!['localhost', '127.0.0.1'].includes(host)) {
  console.error(
    `DATABASE_URL がローカルの DB ではありません（${host || '未設定'}）。` +
      '\n例: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/office_manager',
  );
  process.exit(1);
}

const [command] = process.argv.slice(2);
const run = (...args) => execFileSync('npx', ['prisma', ...args], { stdio: 'inherit' });

if (command === 'seed') {
  run('migrate', 'deploy');
  run('db', 'execute', '--file', 'prisma/seed.sql', '--schema', 'prisma/schema.prisma');
  console.log('ローカルの DB にデータを入れました（dev@4nonome.com / local-dev-password）');
} else {
  console.error('使い方: node scripts/db-local.mjs seed');
  process.exit(1);
}
