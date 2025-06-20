import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';

const prisma = new PrismaClient();

// ユーザー1件取得API
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({ where: { id: Number(params.id) } });
  if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
  return NextResponse.json(user);
}

// ユーザー削除API
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.user.delete({ where: { id: Number(params.id) } });
    return NextResponse.json({ message: '削除しました' }, { status: 204 });
  } catch {
    return NextResponse.json({ error: '削除失敗' }, { status: 404 });
  }
}
