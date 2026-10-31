/**
 * POST /api/users/reset-password/[token] — パスワードの再設定
 * メールで届いた URL のトークンを確かめて、新しいパスワードにする
 */
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleRoute, HttpError, readJson, stringField } from '@/lib/http';

type TokenContext = { params: Promise<{ token: string }> };

export const POST = handleRoute(
  'パスワードの再設定に失敗しました',
  async (req: NextRequest, context: TokenContext) => {
    const password = stringField(await readJson(req), 'password');
    const { token } = await context.params;
    if (!password || !token) throw new HttpError(400, 'パスワードとトークンは必須です');

    const user = await prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpires: { gt: new Date() } },
    });
    if (!user) throw new HttpError(400, 'トークンが無効または期限切れです');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 10),
        resetToken: null,
        resetTokenExpires: null,
      },
    });
    return NextResponse.json({ message: 'パスワードをリセットしました' });
  },
);
