/**
 * 共有Prismaクライアントインスタンス
 * 開発環境での複数クライアントインスタンス防止とコネクションプーリングの最適化
 */
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  warmedUp: boolean | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 開発モードでの複数インスタンス防止
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Prisma Client Warmup
 * 初回接続の遅延を防ぐため、シンプルなクエリで事前にコネクションを確立
 * グローバル状態でキャッシュし、重複実行を防止
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
