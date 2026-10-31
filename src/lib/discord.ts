/**
 * Discord 連携の共通処理
 * - オフィスごとの Webhook URL 解決
 * - 入退室の通知（そのときの在室状況を添えて 1 通で送る）
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

const COLOR_OCCUPIED = 0x57f287;
const COLOR_EMPTY = 0x99aab5;

type PresenceUser = { name: string; enteredAt: Date | null };

/** `<t:UNIX:t>` は Discord が閲覧者のタイムゾーンで時刻表示してくれる */
const formatEnteredAt = (enteredAt: Date | null) =>
  enteredAt ? `<t:${Math.floor(enteredAt.getTime() / 1000)}:t>〜` : '';

/** 入退室のメッセージに添える、そのときの在室状況 */
export const buildPresenceEmbed = (officeName: string, users: PresenceUser[]) => {
  const lines = users.map(u => `🟢 **${u.name}**　${formatEnteredAt(u.enteredAt)}`.trimEnd());
  return {
    title: `📍 ${officeName}の在室状況（${users.length}人）`,
    description: lines.length > 0 ? lines.join('\n') : '現在、誰もいません',
    color: users.length > 0 ? COLOR_OCCUPIED : COLOR_EMPTY,
  };
};

/**
 * 入退室のメッセージに、そのときの在室状況を添えて 1 通で送る。
 * 通知本体を妨げないよう、失敗してもエラーは投げずログに留める。
 */
export const postAttendanceMessage = async (
  officeCode: string,
  webhookUrl: string,
  content: string,
) => {
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

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        embeds: office ? [buildPresenceEmbed(office.name, office.users)] : [],
        allowed_mentions: { parse: [] },
      }),
    });
    if (!res.ok) {
      console.warn('入退室の通知に失敗しました', res.status);
    }
  } catch (error) {
    console.warn('入退室の通知中にエラーが発生しました', error);
  }
};
