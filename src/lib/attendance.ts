/**
 * 退室の猶予（保留）の共通処理
 * アプリはビーコンの圏外になるとすぐには退室にせず、保留にする（/api/users/[id]/leave）。
 * トイレや近くのコンビニに行っただけなら猶予の間に戻ってきて保留が取り消されるので、
 * Discord に退室・入室が流れない。戻らなければ、ここで退室を確定して Discord に通知する。
 */
import { prisma } from '@/lib/prisma';
import { getDefaultWebhookUrl, postAttendanceMessage, resolveWebhookUrl } from '@/lib/discord';

export const EXIT_GRACE_MINUTES = 15;

/**
 * 猶予を過ぎた保留を退室に確定し、在室状況を添えて Discord に通知する。確定した人数を返す。
 * 定期実行（/api/cron/finalize-exits）と、在室状況を返す API の両方から呼ばれる。
 */
export const finalizePendingExits = async (now = new Date()): Promise<number> => {
  const threshold = new Date(now.getTime() - EXIT_GRACE_MINUTES * 60 * 1000);
  const expired = await prisma.user.findMany({
    where: { entered: true, exitPendingSince: { lte: threshold } },
    select: { id: true, name: true, exitPendingSince: true, office: { select: { code: true } } },
  });

  const finalized: typeof expired = [];
  for (const user of expired) {
    // 同時に呼ばれたときに二重に通知しないよう、保留が読んだときのままの場合だけ確定する
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, entered: true, exitPendingSince: user.exitPendingSince },
      data: {
        entered: false,
        exitedAt: user.exitPendingSince,
        note: null,
        exitPendingSince: null,
      },
    });
    if (count === 1) finalized.push(user);
  }

  const defaultWebhook = getDefaultWebhookUrl();
  if (defaultWebhook) {
    for (const user of finalized) {
      await postAttendanceMessage(
        user.office.code,
        resolveWebhookUrl(user.office.code, defaultWebhook),
        `${user.name} さんが 退室 しました！`,
      );
    }
  }

  return finalized.length;
};

