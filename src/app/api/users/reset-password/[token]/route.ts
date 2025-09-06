/**
 * パスワードリセット実行エンドポイント
 * リセットトークンを検証してユーザーパスワードを更新
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, context: any) {
  const { password } = await req.json();
  const { params } = context;
  const { token } = await params;

  if (!password || !token) {
    return NextResponse.json({ error: 'パスワードとトークンは必須です' }, { status: 400 });
  }

  // リセットトークンの検証と有効期限チェック
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: { gt: new Date() },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'トークンが無効または期限切れです' }, { status: 400 });
  }

  // 新しいパスワードをハッシュ化してユーザーレコードを更新
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
