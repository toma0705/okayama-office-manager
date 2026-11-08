/**
 * メールの送信（パスワード再設定の案内）
 *
 * Nodemailer というライブラリで、SMTP サーバー（メールを送るサーバー）を通して送る。
 * どのサーバーから送るかは環境変数 SMTP_HOST・SMTP_PORT・SMTP_USER・SMTP_PASS・SMTP_FROM で決める。
 * Gmail を使うなら、SMTP_HOST=smtp.gmail.com、SMTP_PASS には Google の「アプリパスワード」を入れる。
 */
import nodemailer from 'nodemailer';

/** SMTP の一般的なポート番号（STARTTLS で暗号化する） */
const SMTP_DEFAULT_PORT = 587;

/**
 * パスワード再設定のページの URL を、メールで送る。
 * @param to 送り先のメールアドレス
 * @param resetUrl 再設定のページの URL（例: https://example.com/reset-password/abcd...）
 */
export const sendPasswordResetMail = async (to: string, resetUrl: string) => {
  // メールを送るための接続の設定
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
