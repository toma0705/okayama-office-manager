// GET /api/entered/users
import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Userテーブルのenteredがtrueなユーザー一覧を返す
    const enteredUsers = await prisma.user.findMany({
      where: { entered: true },
      select: {
        id: true,
        name: true,
        iconFileName: true,
        note: true,
        enteredAt: true,
      },
    });
    return NextResponse.json(enteredUsers, { status: 200 });
  } catch {
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
  }
}
