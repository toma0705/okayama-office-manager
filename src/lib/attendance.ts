/**
 * 入退室の保留の共通処理
 * アプリはビーコンの圏内・圏外になってもすぐには入退室にせず、保留にする
 * （/api/users/[id]/arrive と /api/users/[id]/leave）。
 * - 入室: 前を通っただけの人を入室にしないよう、確認の時間の間に圏外にならなければ確定する。
 * - 退室: トイレや近くのコンビニに行っただけなら猶予の間に戻ってきて保留が取り消されるので、
 *   Discord に退室・入室が流れない。戻らなければ退室を確定する。
 * 確定したときに、在室状況を添えて Discord に通知する。
 */
import { prisma } from '@/lib/prisma';
import { getDefaultWebhookUrl, postAttendanceMessage, resolveWebhookUrl } from '@/lib/discord';

export const ENTER_CONFIRM_MINUTES = 1;
export const EXIT_GRACE_MINUTES = 15;

type SettledUser = { name: string; office: { code: string } };

const notifySettled = async (users: SettledUser[], status: '入室' | '退室') => {
  const defaultWebhook = getDefaultWebhookUrl();
  if (!defaultWebhook) return;
  for (const user of users) {
    await postAttendanceMessage(
      user.office.code,
      resolveWebhookUrl(user.office.code, defaultWebhook),
      `${user.name} さんが ${status} しました！`,
    );
  }
};

/**
 * 確認の時間を過ぎた入室の保留を、圏内になった時刻で入室に確定し、Discord に通知する。確定した人数を返す。
 */
export const confirmPendingEnters = async (now = new Date()): Promise<number> => {
  const threshold = new Date(now.getTime() - ENTER_CONFIRM_MINUTES * 60 * 1000);
  const expired = await prisma.user.findMany({
    where: { entered: false, enterPendingSince: { lte: threshold } },
    select: { id: true, name: true, enterPendingSince: true, office: { select: { code: true } } },
  });

  const confirmed: typeof expired = [];
  for (const user of expired) {
    // 同時に呼ばれたときに二重に通知しないよう、保留が読んだときのままの場合だけ確定する
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, entered: false, enterPendingSince: user.enterPendingSince },
      data: {
        entered: true,
        enteredAt: user.enterPendingSince,
        exitedAt: null,
        exitPendingSince: null,
        enterPendingSince: null,
      },
    });
    if (count === 1) confirmed.push(user);
  }

  await notifySettled(confirmed, '入室');
  return confirmed.length;
};

/**
 * 猶予を過ぎた退室の保留を、圏外になった時刻で退室に確定し、Discord に通知する。確定した人数を返す。
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

  await notifySettled(finalized, '退室');
  return finalized.length;
};

/**
 * 入室・退室の保留をまとめて確定する。確定した人数を返す。
 * 定期実行（/api/cron/finalize-exits）と、在室状況を返す API の両方から呼ばれる。
 */
export const settlePendingAttendance = async (now = new Date()) => {
  const entered = await confirmPendingEnters(now);
  const exited = await finalizePendingExits(now);
  return { entered, exited };
};

/**
 * 入室中の全員を退室にする（毎日深夜の定期実行）。退室にした人数を返す。
 * Bluetooth がオフだった、電池が切れたなどで退室を取りこぼした人が、
 * 何日も入室中のまま残らないようにする。夜中に通知が並ばないよう Discord には通知しない。
 */
export const checkoutAllEntered = async (now = new Date()): Promise<number> => {
  const { count } = await prisma.user.updateMany({
    where: { entered: true },
    data: { entered: false, exitedAt: now, note: null, exitPendingSince: null },
  });
  return count;
};
