/**
 * 通知配信 API
 * POST: 入退室イベントを Discord Webhook に転送し、在室ボードを更新する
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDefaultWebhookUrl, resolveWebhookUrl, updateAttendanceBoard } from '@/lib/discord';

export async function POST(req: NextRequest) {
  const defaultWebhook = getDefaultWebhookUrl();

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

  // 入退室のときだけ在室ボードも更新する（メモ追加では更新しない）
  if (officeCode && (status === '入室' || status === '退室')) {
    await updateAttendanceBoard(officeCode, targetWebhook);
  }

  return NextResponse.json({ ok: true });
}
