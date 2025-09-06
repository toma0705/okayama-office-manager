/**
 * ユーザー入室エンドポイント
 * ユーザーを入室状態にマークし、入室時刻を記録
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
    await prisma.user.update({
      where: { id: userId },
      data: {
        entered: true,
        enteredAt: new Date(),
        exitedAt: null,
      },
    });

    return NextResponse.json({ message: '入室しました' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: '入室処理に失敗しました' }, { status: 500 });
  }
}
