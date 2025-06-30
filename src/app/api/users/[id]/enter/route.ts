import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ユーザーの入室処理API（Userテーブルのentered, enteredAt, exitedAtを更新）
export async function POST(
  req: NextRequest,
  context: any
) {
  const { id } = context.params;
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
