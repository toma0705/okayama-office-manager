import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// パスワードリセットトークンの有効期限（30分）
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000;

// SMTP標準ポート
const SMTP_DEFAULT_PORT = 587;

/**
 * パスワードリセット申請エンドポイント
 * リセットトークンを生成してユーザーにリセットメールを送信
 */
export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'メールアドレスは必須です' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // ユーザーが存在しない場合でも成功メッセージを返す
  if (!user) {
    return NextResponse.json({
      message: 'パスワード再設定メールを送信しました',
    });
  }

  // セキュアなランダムトークンを生成（32バイト）
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

  // データベースにリセットトークンを保存
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: expires },
  });

  // パスワードリセットメール送信
  const resetUrl = `${process.env.NEXT_PUBLIC_URL}/reset-password/${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || SMTP_DEFAULT_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: '【Office Manager】パスワード再設定のご案内',
    text: `下記URLから30分以内にパスワードを再設定してください
${resetUrl}`,
    html: `<p>下記URLから30分以内にパスワードを再設定してください。</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  return NextResponse.json({ message: 'パスワード再設定メールを送信しました' });
}
