/**
 * 在室状態の取得エンドポイント
 * バックグラウンドの自動入退室が、判定の前にサーバー上の在室状態を確認するために使う
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAttendanceUserId } from '@/lib/auth';

export async function GET(req: NextRequest) {
  let userId: number | null = null;
  try {
    userId = getAttendanceUserId(req);
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { entered: true } });
    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ entered: user.entered });
  } catch {
    return NextResponse.json({ error: '在室状態の取得に失敗しました' }, { status: 500 });
  }
}
