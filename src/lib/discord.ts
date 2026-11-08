/**
 * Discord への通知
 *
 * Discord の「Webhook」を使う。Webhook は、チャンネルごとに発行される専用の URL で、
 * そこに JSON を POST すると、そのチャンネルにメッセージが投稿される（Bot を作る必要がない）。
 * 発行の仕方: Discord のチャンネルの設定 → 連携サービス → ウェブフック → 新しいウェブフック → URL をコピー
 *
 * - オフィスごとに通知先を変えられる（環境変数 DISCORD_WEBHOOK_URL_<オフィスのコード>）
 * - 入退室のメッセージには、そのときの在室状況（だれがいるか）を添えて 1 通で送る
 */
import { prisma } from '@/lib/prisma';

/**
 * オフィスごとの設定がないときに使う、既定の通知先（DISCORD_WEBHOOK_URL_DEFAULT）。
 * 昔の設定との互換のため、なければ DISCORD_WEBHOOK_URL_OKAYAMA を使う。どちらもなければ null。
 */
export const getDefaultWebhookUrl = () =>
  process.env.DISCORD_WEBHOOK_URL_DEFAULT ?? process.env.DISCORD_WEBHOOK_URL_OKAYAMA ?? null;

/**
 * オフィスのコードから、そのオフィスの通知先を決める。
 *   resolveWebhookUrl('tokyo', 既定) → 環境変数 DISCORD_WEBHOOK_URL_TOKYO があればそれ、なければ 既定
 */
export const resolveWebhookUrl = (officeCode: string | null | undefined, fallback: string) => {
  if (!officeCode) return fallback;

  const normalized = officeCode.trim().toUpperCase();
  if (!normalized) return fallback;

  const envKey = `DISCORD_WEBHOOK_URL_${normalized}`;
  return process.env[envKey] ?? fallback;
};

// メッセージの左端に出る線の色（だれかいれば緑、だれもいなければ灰色）
const COLOR_OCCUPIED = 0x57f287;
const COLOR_EMPTY = 0x99aab5;

type PresenceUser = { name: string; enteredAt: Date | null };

/**
 * 入室した時刻を「10:30〜」のように表示する文字列にする。
 * `<t:UNIX時刻:t>` と書くと、Discord が見ている人のタイムゾーンで時刻を表示してくれる。
 */
const formatEnteredAt = (enteredAt: Date | null) =>
  enteredAt ? `<t:${Math.floor(enteredAt.getTime() / 1000)}:t>〜` : '';

/**
 * 入退室のメッセージに添える「在室状況」のカード（Discord の embed）を作る。
 *   📍 岡山オフィスの在室状況（2人）
 *   🟢 山田　10:30〜
 *   🟢 佐藤　11:00〜
 */
export const buildPresenceEmbed = (officeName: string, users: PresenceUser[]) => {
  const lines = users.map(u => `🟢 **${u.name}**　${formatEnteredAt(u.enteredAt)}`.trimEnd());
  return {
    title: `📍 ${officeName}の在室状況（${users.length}人）`,
    description: lines.length > 0 ? lines.join('\n') : '現在、誰もいません',
    color: users.length > 0 ? COLOR_OCCUPIED : COLOR_EMPTY,
  };
};

type DiscordEmbed = ReturnType<typeof buildPresenceEmbed>;

/**
 * Webhook にメッセージを送る。メモなど利用者が書いた文に @everyone や @here が含まれていても、
 * メンションとして鳴らさない（allowed_mentions）。
 * 呼び出し元の処理を妨げないよう、失敗してもエラーは投げずログに留める。
 */
export const postDiscordMessage = async (
  webhookUrl: string,
  content: string,
  embeds: DiscordEmbed[] = [],
) => {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, embeds, allowed_mentions: { parse: [] } }),
    });
    if (!res.ok) {
      console.warn('Discord への通知に失敗しました', res.status);
    }
  } catch (error) {
    console.warn('Discord への通知中にエラーが発生しました', error);
  }
};

/**
 * 入退室のメッセージに、そのときの在室状況を添えて 1 通で送る。
 * 「山田 さんが 入室 しました！」＋ 在室状況のカード、という形になる。
 */
export const postAttendanceMessage = async (
  officeCode: string,
  webhookUrl: string,
  content: string,
) => {
  let embeds: DiscordEmbed[] = [];
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
    if (office) embeds = [buildPresenceEmbed(office.name, office.users)];
  } catch (error) {
    // 在室状況が取れなくても、入退室のメッセージは送る
    console.warn('在室状況の取得に失敗しました', error);
  }
  await postDiscordMessage(webhookUrl, content, embeds);
};
