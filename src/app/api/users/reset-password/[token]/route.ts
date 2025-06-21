import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// POST /api/users/reset-password/[token]
export async function POST(req: NextRequest, context: { params: { token: string } }) {
  const { password } = await req.json();
  const { token } = context.params;
  if (!password || !token) {
    return NextResponse.json({ error: 'パスワードとトークンは必須です' }, { status: 400 });
  }
  // トークンが有効かチェック
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: { gt: new Date() },
    },
  });
  if (!user) {
    return NextResponse.json({ error: 'トークンが無効または期限切れです' }, { status: 400 });
  }
  // パスワードをハッシュ化して保存
  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetTokenExpires: null,
    },
  });
  return NextResponse.json({ message: 'パスワードをリセットしました' });
}
