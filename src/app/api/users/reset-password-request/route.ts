/**
 * POST /api/users/reset-password-request — パスワード再設定の申請
 * 再設定用のトークンを作り、再設定ページの URL をメールで送る（30 分有効）
 */
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleRoute, HttpError, readJson, stringField } from '@/lib/http';
import { sendPasswordResetMail } from '@/lib/mail';

const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const SENT_MESSAGE = 'パスワード再設定メールを送信しました';

export const POST = handleRoute(
  'パスワード再設定メールの送信に失敗しました',
  async (req: NextRequest) => {
    const email = stringField(await readJson(req), 'email');
    if (!email) throw new HttpError(400, 'メールアドレスは必須です');

    // 登録されていないメールアドレスでも同じ応答にする（登録の有無を知られないように）
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ message: SENT_MESSAGE });

    const token = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS) },
    });

    await sendPasswordResetMail(email, `${process.env.NEXT_PUBLIC_URL}/reset-password/${token}`);
    return NextResponse.json({ message: SENT_MESSAGE });
  },
);
