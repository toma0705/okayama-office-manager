/**
 * パスワードリセット申請エンドポイント
 * リセットトークンを生成してユーザーにリセットメールを送信
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'メールアドレスは必須です' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    // ユーザーが存在しない場合でも成功メッセージを返す（セキュリティのベストプラクティス）
    return NextResponse.json({
      message: 'パスワード再設定メールを送信しました',
    });
  }

  // セキュアなランダムトークンを生成（32バイト）
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 30); // 30分間の有効期限

  // データベースにリセットトークンを保存
  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpires: expires },
  });

  // Send password reset email
  const resetUrl = `${process.env.NEXT_PUBLIC_URL}/reset-password/${token}`;

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
    text: `下記URLから30分以内にパスワードを再設定してください
${resetUrl}`,
    html: `<p>下記URLから30分以内にパスワードを再設定してください。</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });

  return NextResponse.json({ message: 'パスワード再設定メールを送信しました' });
}
