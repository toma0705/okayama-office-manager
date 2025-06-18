// GET /api/entered/users
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const enteredUsers = await prisma.enter.findMany({
      where: { exitAt: null },
      include: {
        user: true,
      },
    });

    return NextResponse.json(enteredUsers, { status: 200 });
  } catch {
    return NextResponse.json({ error: '取得に失敗しました' }, { status: 500 });
  }
}
