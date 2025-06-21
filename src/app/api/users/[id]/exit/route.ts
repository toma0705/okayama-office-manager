import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

// ユーザーの退室処理API
export async function POST(req: NextRequest, context: any) {
  const params = context.params;
  const userId = Number(params.id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: '不正なIDです' }, { status: 400 });
  }

  try {
    const lastEntry = await prisma.enter.findFirst({
      where: { userId, exitAt: null },
      orderBy: { enteredAt: 'desc' },
    });
    if (!lastEntry) {
      return NextResponse.json({ error: '入室記録が見つかりません' }, { status: 404 });
    }
    await prisma.enter.update({
      where: { id: lastEntry.id },
      data: { exitAt: new Date() },
    });
    return NextResponse.json({ message: '退室しました' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: '退室処理に失敗しました' }, { status: 500 });
  }
}
