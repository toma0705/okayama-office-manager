/**
 * DB（データベース）につなぐための「Prisma Client」を 1 つだけ作って、アプリ全体で使い回す。
 *
 * Prisma は、TypeScript から DB を読み書きするためのライブラリ。
 * SQL を直接書かなくても、次のように書けば DB を操作できる。
 *
 *   const user = await prisma.user.findUnique({ where: { id: 1 } }); // id が 1 のユーザーを探す
 *
 * テーブルの形は prisma/schema.prisma に書いてあり、`npx prisma generate` で
 * そこから src/generated/prisma に型付きのクライアントが作られる。
 */
import { PrismaClient } from '@/generated/prisma/client';

// 開発中（npm run dev）はファイルを保存するたびにコードが読み込み直される。
// そのたびに新しい PrismaClient を作ると DB への接続が増え続けるので、
// globalThis（読み込み直しても消えない場所）に 1 つだけ置いておく。
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  warmedUp: boolean | undefined;
};

/** アプリ全体で使う DB のクライアント。どのファイルからも `import { prisma } from '@/lib/prisma'` で使う */
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * DB に簡単な問い合わせ（SELECT 1）を送って、接続を先に作っておく。
 * 最初の 1 回目の接続は時間がかかるので、/api/warmup から呼んで準備しておくために使う。
 * 失敗してもエラーは投げない（ログに残すだけ）。
 */
export async function warmupPrisma() {
  if (globalForPrisma.warmedUp) {
    console.log('Prisma クライアントは既にウォームアップ済み');
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    globalForPrisma.warmedUp = true;
    console.log('Prisma クライアントのウォームアップに成功しました');
  } catch (error) {
    console.warn('Prisma のウォームアップに失敗しました:', error);
  }
}
