/**
 * POST /api/notify — Discord に通知する（入室・退室・メモの追加）
 * 入退室は、そのときの在室状況を添えて 1 通で送る。メモはメモだけ送る。
 * 名前とオフィスは送信内容ではなくトークンのユーザーから決める（なりすまし防止）。
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getDefaultWebhookUrl,
  postAttendanceMessage,
  postDiscordMessage,
  resolveWebhookUrl,
} from '@/lib/discord';
import { handleRoute, HttpError, readJson, requireAuth } from '@/lib/http';

const NOTIFY_STATUSES = ['入室', '退室', 'メモを追加'];

export const POST = handleRoute('通知に失敗しました', async (req: NextRequest) => {
  const userId = requireAuth(req);

  const defaultWebhook = getDefaultWebhookUrl();
  if (!defaultWebhook) {
    throw new HttpError(
      500,
      'DISCORD_WEBHOOK_URL_DEFAULT または DISCORD_WEBHOOK_URL_OKAYAMA が設定されていません',
    );
  }

  const { status, note } = await readJson(req);
  if (typeof status !== 'string' || !NOTIFY_STATUSES.includes(status)) {
    throw new HttpError(400, '不正なステータスです');
  }

  const sender = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, office: { select: { code: true } } },
  });
  if (!sender) throw new HttpError(404, 'ユーザーが見つかりません');

  const officeCode = sender.office.code;
  const webhookUrl = resolveWebhookUrl(officeCode, defaultWebhook);
  const trimmedNote = typeof note === 'string' ? note.trim() : '';
  const content = trimmedNote
    ? `${sender.name} さんのメモ: ${trimmedNote}`
    : `${sender.name} さんが ${status} しました！`;

  if (status === 'メモを追加') {
    await postDiscordMessage(webhookUrl, content);
  } else {
    await postAttendanceMessage(officeCode, webhookUrl, content);
  }

  return NextResponse.json({ ok: true });
});
