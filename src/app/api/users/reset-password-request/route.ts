import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// POST /api/users/reset-password-request
export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: 'メールアドレスは必須です' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // メールアドレスが存在しない場合も「送信完了」と返す（情報漏洩防止）
    return NextResponse.json({ message: 'パスワード再設定メールを送信しました' });
  }
  // トークン生成（32文字のランダム文字列）
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30分有効
  // トークンをDBに保存（UserテーブルにresetToken, resetTokenExpiresを追加している前提）
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: expires },
  });
  // 本来はここでメール送信処理（今回はダミー: URLを返す）
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password/${token}`;
  // console.log(`パスワード再設定URL: ${resetUrl}`);
  // 本番用: メール送信
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
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
    text: `下記URLから30分以内にパスワードを再設定してください\n${resetUrl}`,
    html: `<p>下記URLから30分以内にパスワードを再設定してください。</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
  return NextResponse.json({ message: 'パスワード再設定メールを送信しました' });
}
