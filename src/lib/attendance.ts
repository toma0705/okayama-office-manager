/**
 * 入退室の記録
 *
 * 記録の仕方は 2 通りある。
 * - Web の入室・退室ボタン: すぐに入室・退室にする（enterNow / exitNow）
 * - アプリのビーコン検知: すぐには入退室にせず「保留」にする（arrive / leave）
 *   - 入室: 前を通っただけの人を入室にしないよう、確認の時間（1分）の間に圏外にならなければ確定する
 *   - 退室: トイレや近くのコンビニに行っただけなら猶予（15分）の間に戻ってきて取り消される
 *   保留は定期実行（cron-job.org から毎分）と /api/users/me で確定し、在室状況を添えて Discord に通知する。
 *
 * 状態の組み合わせ（entered / enterPendingSince / exitPendingSince）
 *   退室中          false / null / null
 *   入室の保留中    false / 時刻 / null
 *   入室中          true  / null / null
 *   退室の保留中    true  / null / 時刻
 */
import type { User } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { getDefaultWebhookUrl, postAttendanceMessage, resolveWebhookUrl } from '@/lib/discord';

export const ENTER_CONFIRM_MINUTES = 1;
export const EXIT_GRACE_MINUTES = 15;

type AttendanceState = Pick<User, 'id' | 'entered' | 'enterPendingSince' | 'exitPendingSince'>;

/** 入室にするときの更新内容。保留はどちらも消す */
export const enteredData = (enteredAt: Date) => ({
  entered: true,
  enteredAt,
  exitedAt: null,
  enterPendingSince: null,
  exitPendingSince: null,
});

/** 退室にするときの更新内容。メモと保留も消す */
export const exitedData = (exitedAt: Date) => ({
  entered: false,
  exitedAt,
  note: null,
  enterPendingSince: null,
  exitPendingSince: null,
});

/**
 * Web の入室ボタン。すぐに入室にする。
 * 退室の保留中なら、入室の時刻を保ったまま保留を取り消す（resumed）
 */
export const enterNow = async (user: AttendanceState, now = new Date()) => {
  if (user.entered && user.exitPendingSince) {
    await prisma.user.update({ where: { id: user.id }, data: { exitPendingSince: null } });
    return 'resumed' as const;
  }
  await prisma.user.update({ where: { id: user.id }, data: enteredData(now) });
  return 'entered' as const;
};

/** Web の退室ボタン。すぐに退室にする。すでに退室中なら false */
export const exitNow = async (user: AttendanceState, now = new Date()) => {
  if (!user.entered) return false;
  await prisma.user.update({ where: { id: user.id }, data: exitedData(now) });
  return true;
};

/**
 * ビーコンの圏内になった（アプリ）。
 * - 退室中: 入室の保留を始める（保留中なら最初に圏内になった時刻を保つ）→ 'pending'
 * - 退室の保留中: 猶予の間に戻ってきたので保留を取り消す → 'resumed'
 * - 入室中: 何もしない → 'entered'
 */
export const arrive = async (user: AttendanceState, now = new Date()) => {
  if (user.entered) {
    if (!user.exitPendingSince) return 'entered' as const;
    await prisma.user.update({ where: { id: user.id }, data: { exitPendingSince: null } });
    return 'resumed' as const;
  }
  if (!user.enterPendingSince) {
    await prisma.user.update({ where: { id: user.id }, data: { enterPendingSince: now } });
  }
  return 'pending' as const;
};

/**
 * ビーコンの圏外になった（アプリ）。
 * - 入室中: 退室の保留を始める（保留中なら最初に圏外になった時刻を保つ）→ 'pending'
 * - 入室の保留中: 前を通っただけなので保留を取り消す → 'exited'
 * - 退室中: 何もしない → 'exited'
 */
export const leave = async (user: AttendanceState, now = new Date()) => {
  if (!user.entered) {
    if (user.enterPendingSince) {
      await prisma.user.update({ where: { id: user.id }, data: { enterPendingSince: null } });
    }
    return 'exited' as const;
  }
  if (!user.exitPendingSince) {
    await prisma.user.update({ where: { id: user.id }, data: { exitPendingSince: now } });
  }
  return 'pending' as const;
};

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

const minutesBefore = (now: Date, minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

/**
 * 確認の時間を過ぎた入室の保留を、圏内になった時刻で入室に確定し、Discord に通知する。確定した人数を返す。
 */
export const confirmPendingEnters = async (now = new Date()): Promise<number> => {
  const expired = await prisma.user.findMany({
    where: {
      entered: false,
      enterPendingSince: { lte: minutesBefore(now, ENTER_CONFIRM_MINUTES) },
    },
    select: { id: true, name: true, enterPendingSince: true, office: { select: { code: true } } },
  });

  const confirmed: typeof expired = [];
  for (const user of expired) {
    // 同時に呼ばれたときに二重に通知しないよう、保留が読んだときのままの場合だけ確定する
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, entered: false, enterPendingSince: user.enterPendingSince },
      data: enteredData(user.enterPendingSince!),
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
  const expired = await prisma.user.findMany({
    where: { entered: true, exitPendingSince: { lte: minutesBefore(now, EXIT_GRACE_MINUTES) } },
    select: { id: true, name: true, exitPendingSince: true, office: { select: { code: true } } },
  });

  const finalized: typeof expired = [];
  for (const user of expired) {
    // 同時に呼ばれたときに二重に通知しないよう、保留が読んだときのままの場合だけ確定する
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, entered: true, exitPendingSince: user.exitPendingSince },
      data: exitedData(user.exitPendingSince!),
    });
    if (count === 1) finalized.push(user);
  }

  await notifySettled(finalized, '退室');
  return finalized.length;
};

/**
 * 入室・退室の保留をまとめて確定する。確定した人数を返す。
 * 定期実行（/api/cron/finalize-exits）と、在室状況を返す /api/users/me の両方から呼ばれる。
 */
export const settlePendingAttendance = async (now = new Date()) => {
  const entered = await confirmPendingEnters(now);
  const exited = await finalizePendingExits(now);
  return { entered, exited };
};

/**
 * 入室中の全員を退室にする（毎日 4:00 の定期実行）。退室にした人数を返す。
 * Bluetooth がオフだった、電池が切れたなどで退室を取りこぼした人が、
 * 何日も入室中のまま残らないようにする。夜中に通知が並ばないよう Discord には通知しない。
 */
export const checkoutAllEntered = async (now = new Date()): Promise<number> => {
  const { count } = await prisma.user.updateMany({
    where: { entered: true },
    data: exitedData(now),
  });
  return count;
};
