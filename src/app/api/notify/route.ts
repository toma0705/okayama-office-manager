/**
 * 通知配信 API
 * POST: 入退室イベントを Discord Webhook に転送する（入退室は在室状況を添えて送る）
 * ログイン用トークンが必要。名前とオフィスは送信内容ではなくトークンのユーザーから決める（なりすまし防止）
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';
import { getDefaultWebhookUrl, postAttendanceMessage, resolveWebhookUrl } from '@/lib/discord';

const NOTIFY_STATUSES = ['入室', '退室', 'メモを追加'];

export async function POST(req: NextRequest) {
  let userId: number | null = null;
  try {
    userId = getAuthenticatedUserId(req);
  } catch {
    userId = null;
  }
  if (!userId) {
    return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
  }

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

  const { status, note } = await req.json();
  if (!NOTIFY_STATUSES.includes(status)) {
    return NextResponse.json({ error: '不正なステータスです' }, { status: 400 });
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, office: { select: { code: true } } },
  });
  if (!sender) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
  }
  const user = sender.name;
  const officeCode = sender.office.code;

  const targetWebhook = resolveWebhookUrl(officeCode, defaultWebhook);
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  const attendanceMessage = `${user} さんが ${status} しました！`;
  const content = trimmedNote ? `${user} さんのメモ: ${trimmedNote}` : attendanceMessage;

  // 入退室のときは、そのときの在室状況を添えて 1 通で送る（メモ追加はメモだけ）
  if (officeCode && (status === '入室' || status === '退室')) {
    await postAttendanceMessage(officeCode, targetWebhook, content);
  } else {
    await fetch(targetWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  }

  return NextResponse.json({ ok: true });
}
