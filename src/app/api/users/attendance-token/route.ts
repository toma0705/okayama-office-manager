/**
 * 自動入退室専用トークンの発行エンドポイント
 * ログイン中のアプリが呼び、バックグラウンドの入退室に使う長期トークンを受け取る
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ATTENDANCE_TOKEN_EXPIRES_IN, getAuthenticatedUserId, signAttendanceToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  let userId: number | null = null;
  try {
    userId = getAuthenticatedUserId(req);
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      token: signAttendanceToken(user.id),
      expiresIn: ATTENDANCE_TOKEN_EXPIRES_IN,
    });
  } catch {
    return NextResponse.json({ error: 'トークンの発行に失敗しました' }, { status: 500 });
  }
}
