/**
 * 通知配信 API
 * POST: 入退室イベントを Discord Webhook に転送する
 */
import { NextRequest, NextResponse } from 'next/server';

const resolveWebhookUrl = (officeCode: string | null | undefined, fallback: string) => {
  if (!officeCode) return fallback;

  const normalized = officeCode.trim().toUpperCase();
  if (!normalized) return fallback;

  const envKey = `DISCORD_WEBHOOK_URL_${normalized}`;
  return process.env[envKey] ?? fallback;
};

export async function POST(req: NextRequest) {
  const defaultWebhook =
    process.env.DISCORD_WEBHOOK_URL_DEFAULT ?? process.env.DISCORD_WEBHOOK_URL_OKAYAMA ?? null;

  if (!defaultWebhook) {
    return NextResponse.json(
      {
        error:
          'DISCORD_WEBHOOK_URL_DEFAULT または DISCORD_WEBHOOK_URL_OKAYAMA が設定されていません',
      },
      { status: 500 },
    );
  }

  const { user, status, officeCode, note } = await req.json();

  const targetWebhook = resolveWebhookUrl(officeCode, defaultWebhook);
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  const attendanceMessage = `${user} さんが ${status} しました！`;
  const content = trimmedNote ? `${user} さんのメモ: ${trimmedNote}` : attendanceMessage;

  await fetch(targetWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  return NextResponse.json({ ok: true });
}
