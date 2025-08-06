/**
 * 共有Prismaクライアントインスタンス
 * 開発環境での複数クライアントインスタンス防止とコネクションプーリングの最適化
 */
import { PrismaClient } from '@/generated/prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 開発モードでの複数インスタンス防止
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
