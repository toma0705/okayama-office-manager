/**
 * メールの送信（パスワード再設定の案内）。SMTP_* の環境変数で送信元のサーバーを設定する
 */
import nodemailer from 'nodemailer';

const SMTP_DEFAULT_PORT = 587;

export const sendPasswordResetMail = async (to: string, resetUrl: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || SMTP_DEFAULT_PORT,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: '【Office Manager】パスワード再設定のご案内',
    text: `下記URLから30分以内にパスワードを再設定してください\n${resetUrl}`,
    html: `<p>下記URLから30分以内にパスワードを再設定してください。</p><p><a href='${resetUrl}'>${resetUrl}</a></p>`,
  });
};
