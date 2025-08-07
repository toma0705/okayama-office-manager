/**
 * Prisma Client Warmup API
 * データベース接続の初期化を行う軽量エンドポイント
 */
import { NextResponse } from 'next/server';
import { warmupPrisma } from '@/lib/prisma';

/**
 * データベース接続Warmup
 * アプリケーション起動時に事前にコネクションを確立
 */
export async function GET() {
  try {
    await warmupPrisma();
    return NextResponse.json({
      status: 'warmed up',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Warmup failed:', error);
    return NextResponse.json({ error: 'Warmup failed' }, { status: 500 });
  }
}

/**
 * ヘルスチェック用HEAD method
 * 軽量な接続確認
 */
export async function HEAD() {
  return new Response(null, { status: 200 });
}
