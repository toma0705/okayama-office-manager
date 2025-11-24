/**
 * ユーザー退室エンドポイント
 * ユーザーを退室状態にマークし、退室時刻を記録
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, context: any) {
  const { params } = context;
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) {
    return NextResponse.json({ error: '不正なIDです' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (!user.entered) {
      return NextResponse.json({ error: 'すでに退室済みです' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        entered: false,
        exitedAt: new Date(),
        note: null,
      },
    });

    return NextResponse.json({ message: '退室しました' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: '退室処理に失敗しました' }, { status: 500 });
  }
}
