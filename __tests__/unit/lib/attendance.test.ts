jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findMany: jest.fn(), updateMany: jest.fn() } },
}));

jest.mock('@/lib/discord', () => ({
  getDefaultWebhookUrl: jest.fn(() => 'https://discord.com/api/webhooks/default'),
  resolveWebhookUrl: jest.fn((_code: string, fallback: string) => fallback),
  updateAttendanceBoard: jest.fn().mockResolvedValue(undefined),
}));

import { EXIT_GRACE_MINUTES, finalizePendingExits } from '@/lib/attendance';

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const discord = jest.requireMock('@/lib/discord') as any;

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

  it('退室を圏外になった時刻で確定し、Discord に通知して在室ボードを更新する', async () => {
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
    expect(global.fetch).toHaveBeenCalledWith(
      'https://discord.com/api/webhooks/default',
      expect.objectContaining({
        body: JSON.stringify({ content: '山田 さんが 退室 しました！' }),
      }),
    );
    expect(discord.updateAttendanceBoard).toHaveBeenCalledWith(
      'OKAYAMA',
      'https://discord.com/api/webhooks/default',
    );
  });

  it('同時に確定された（または取り消された）人には通知しない', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: '山田', exitPendingSince: pendingSince, office: { code: 'OKAYAMA' } },
    ]);
    prisma.user.updateMany.mockResolvedValue({ count: 0 });

    const count = await finalizePendingExits(now);

    expect(count).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(discord.updateAttendanceBoard).not.toHaveBeenCalled();
  });
});
