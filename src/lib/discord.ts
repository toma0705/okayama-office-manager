/**
 * Discord 連携の共通処理
 * - オフィスごとの Webhook URL 解決
 * - 在室ボード（1 通のメッセージを編集し続ける）の更新
 */
import { prisma } from '@/lib/prisma';

export const getDefaultWebhookUrl = () =>
  process.env.DISCORD_WEBHOOK_URL_DEFAULT ?? process.env.DISCORD_WEBHOOK_URL_OKAYAMA ?? null;

export const resolveWebhookUrl = (officeCode: string | null | undefined, fallback: string) => {
  if (!officeCode) return fallback;

  const normalized = officeCode.trim().toUpperCase();
  if (!normalized) return fallback;

  const envKey = `DISCORD_WEBHOOK_URL_${normalized}`;
  return process.env[envKey] ?? fallback;
};

const BOARD_COLOR_OCCUPIED = 0x57f287;
const BOARD_COLOR_EMPTY = 0x99aab5;

type BoardUser = { name: string; enteredAt: Date | null };

/** `<t:UNIX:t>` は Discord が閲覧者のタイムゾーンで時刻表示してくれる */
const formatEnteredAt = (enteredAt: Date | null) =>
  enteredAt ? `<t:${Math.floor(enteredAt.getTime() / 1000)}:t>〜` : '';

export const buildBoardEmbed = (officeName: string, users: BoardUser[], now = new Date()) => {
  const lines = users.map(u => `🟢 **${u.name}**　${formatEnteredAt(u.enteredAt)}`.trimEnd());
  return {
    title: `📍 ${officeName} の在室状況`,
    description: lines.length > 0 ? lines.join('\n') : '現在、誰もいません',
    color: users.length > 0 ? BOARD_COLOR_OCCUPIED : BOARD_COLOR_EMPTY,
    footer: { text: `在室 ${users.length}人` },
    timestamp: now.toISOString(),
  };
};

/**
 * 在室ボードを最新状態に更新する。
 * 既存メッセージがあれば編集、無い（または削除された）場合は新規投稿して ID を保存する。
 * 通知本体を妨げないよう、失敗してもエラーは投げずログに留める。
 */
export const updateAttendanceBoard = async (officeCode: string, webhookUrl: string) => {
  try {
    const office = await prisma.office.findUnique({
      where: { code: officeCode },
      include: {
        users: {
          where: { entered: true },
          orderBy: { enteredAt: 'asc' },
          select: { name: true, enteredAt: true },
        },
      },
    });
    if (!office) return;

    const body = JSON.stringify({
      embeds: [buildBoardEmbed(office.name, office.users)],
      allowed_mentions: { parse: [] },
    });
    const headers = { 'Content-Type': 'application/json' };

    if (office.discordBoardMessageId) {
      const res = await fetch(`${webhookUrl}/messages/${office.discordBoardMessageId}`, {
        method: 'PATCH',
        headers,
        body,
      });
      if (res.ok) return;
      if (res.status !== 404) {
        console.warn('在室ボードの更新に失敗しました', res.status);
        return;
      }
      // メッセージが削除されていた場合は作り直す
    }

    const res = await fetch(`${webhookUrl}?wait=true`, { method: 'POST', headers, body });
    if (!res.ok) {
      console.warn('在室ボードの投稿に失敗しました', res.status);
      return;
    }
    const message = (await res.json()) as { id?: string };
    if (message.id) {
      await prisma.office.update({
        where: { id: office.id },
        data: { discordBoardMessageId: message.id },
      });
    }
  } catch (error) {
    console.warn('在室ボードの更新中にエラーが発生しました', error);
  }
};
