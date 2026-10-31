/**
 * /api/warmup — DB への接続を先に済ませておく（初回の応答が遅くならないように）
 * GET: 接続を確立する / HEAD: 死活確認
 */
import { NextResponse } from 'next/server';
import { warmupPrisma } from '@/lib/prisma';

export async function GET() {
  await warmupPrisma();
  return NextResponse.json({ status: 'warmed up', timestamp: new Date().toISOString() });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}
