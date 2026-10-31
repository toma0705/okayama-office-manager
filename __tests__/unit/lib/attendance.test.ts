jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: jest.fn(), updateMany: jest.fn() } },
}));

jest.mock('@/lib/discord', () => ({
  getDefaultWebhookUrl: jest.fn(() => 'https://discord.com/api/webhooks/default'),
  resolveWebhookUrl: jest.fn((_code: string, fallback: string) => fallback),
  postAttendanceMessage: jest.fn().mockResolvedValue(undefined),
}));

import {
  ENTER_CONFIRM_MINUTES,
  EXIT_GRACE_MINUTES,
  checkoutAllEntered,
  confirmPendingEnters,
  finalizePendingExits,
  settlePendingAttendance,
} from '@/lib/attendance';

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const discord = jest.requireMock('@/lib/discord') as any;

describe('confirmPendingEnters', () => {
  const now = new Date('2026-10-31T10:00:00Z');
  const pendingSince = new Date('2026-10-31T09:58:30Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('確認の時間を過ぎた保留だけを探す', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await confirmPendingEnters(now);

    const threshold = new Date(now.getTime() - ENTER_CONFIRM_MINUTES * 60 * 1000);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entered: false, enterPendingSince: { lte: threshold } },
      }),
    );
  });

  it('入室を圏内になった時刻で確定し、在室状況を添えて Discord に通知する', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: '山田', enterPendingSince: pendingSince, office: { code: 'OKAYAMA' } },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const count = await confirmPendingEnters(now);

    expect(count).toBe(1);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 1, entered: false, enterPendingSince: pendingSince },
      data: {
        entered: true,
        enteredAt: pendingSince,
        exitedAt: null,
        exitPendingSince: null,
        enterPendingSince: null,
      },
    });
    expect(discord.postAttendanceMessage).toHaveBeenCalledWith(
      'OKAYAMA',
      'https://discord.com/api/webhooks/default',
      '山田 さんが 入室 しました！',
    );
  });

  it('同時に確定された（または取り消された）人には通知しない', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: '山田', enterPendingSince: pendingSince, office: { code: 'OKAYAMA' } },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    const count = await confirmPendingEnters(now);

    expect(count).toBe(0);
    expect(discord.postAttendanceMessage).not.toHaveBeenCalled();
  });
});

describe('settlePendingAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('入室と退室の保留をまとめて確定し、それぞれの人数を返す', async () => {
    const now = new Date('2026-10-31T10:00:00Z');
    prisma.user.findMany
      .mockResolvedValueOnce([
        { id: 1, name: '山田', enterPendingSince: now, office: { code: 'OKAYAMA' } },
      ])
      .mockResolvedValueOnce([]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    await expect(settlePendingAttendance(now)).resolves.toEqual({ entered: 1, exited: 0 });
    expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
  });
});

describe('finalizePendingExits', () => {
  const originalFetch = global.fetch;
  const now = new Date('2026-10-28T10:00:00Z');
  const pendingSince = new Date('2026-10-28T09:40:00Z');

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('猶予を過ぎた保留だけを探す', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await finalizePendingExits(now);

    const threshold = new Date(now.getTime() - EXIT_GRACE_MINUTES * 60 * 1000);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entered: true, exitPendingSince: { lte: threshold } },
      }),
    );
  });

  it('退室を圏外になった時刻で確定し、在室状況を添えて Discord に通知する', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: '山田', exitPendingSince: pendingSince, office: { code: 'OKAYAMA' } },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });

    const count = await finalizePendingExits(now);

    expect(count).toBe(1);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 1, entered: true, exitPendingSince: pendingSince },
      data: { entered: false, exitedAt: pendingSince, note: null, exitPendingSince: null },
    });
    expect(discord.postAttendanceMessage).toHaveBeenCalledWith(
      'OKAYAMA',
      'https://discord.com/api/webhooks/default',
      '山田 さんが 退室 しました！',
    );
  });

  it('同時に確定された（または取り消された）人には通知しない', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: '山田', exitPendingSince: pendingSince, office: { code: 'OKAYAMA' } },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    const count = await finalizePendingExits(now);

    expect(count).toBe(0);
    expect(discord.postAttendanceMessage).not.toHaveBeenCalled();
  });
});

describe('checkoutAllEntered', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('入室中の全員を退室にし、保留とメモも消す（Discord には通知しない）', async () => {
    const now = new Date('2026-10-31T19:00:00Z');
    prisma.user.updateMany.mockResolvedValue({ count: 3 });

    const count = await checkoutAllEntered(now);

    expect(count).toBe(3);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { entered: true },
      data: { entered: false, exitedAt: now, note: null, exitPendingSince: null },
    });
    expect(discord.postAttendanceMessage).not.toHaveBeenCalled();
  });
});
