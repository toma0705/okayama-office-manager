import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

// ユーザーの入室記録を作成するAPI
export async function POST(
  req: NextRequest,
  context: { params: Record<string, string> }
) {
  const { id } = context.params;
  const userId = Number(id);

  if (isNaN(userId)) {
    return NextResponse.json({ error: '不正なIDです' }, { status: 400 });
  }

  try {
    await prisma.enter.create({
      data: {
        userId,
        enteredAt: new Date(),
        exitAt: null,
      },
    });
    return NextResponse.json({ message: '入室しました' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: '入室記録の作成に失敗しました' }, { status: 500 });
  }
}
