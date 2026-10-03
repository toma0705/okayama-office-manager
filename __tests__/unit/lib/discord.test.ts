jest.mock('@/lib/prisma', () => ({
  prisma: { office: { findUnique: jest.fn(), update: jest.fn() } },
}));

import { buildBoardEmbed, updateAttendanceBoard } from '@/lib/discord';

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const webhook = 'https://discord.com/api/webhooks/1/token';
const enteredAt = new Date('2026-10-03T01:30:00Z');
const unix = Math.floor(enteredAt.getTime() / 1000);

describe('buildBoardEmbed', () => {
  it('在室者の名前と入室時刻を並べる', () => {
    const embed = buildBoardEmbed('岡山オフィス', [{ name: '山田', enteredAt }]);

    expect(embed.description).toContain('**山田**');
    expect(embed.description).toContain(`<t:${unix}:t>〜`);
    expect(embed.footer.text).toBe('在室 1人');
  });

  it('誰もいないときはその旨を表示する', () => {
    const embed = buildBoardEmbed('岡山オフィス', []);

    expect(embed.description).toBe('現在、誰もいません');
    expect(embed.footer.text).toBe('在室 0人');
  });
});

describe('updateAttendanceBoard', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  const office = (discordBoardMessageId: string | null) => ({
    id: 1,
    name: '岡山オフィス',
    discordBoardMessageId,
    users: [{ name: '山田', enteredAt }],
  });

  it('メッセージ未作成なら新規投稿して ID を保存する', async () => {
    prisma.office.findUnique.mockResolvedValue(office(null));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'msg-1' }),
    }) as any;

    await updateAttendanceBoard('OKAYAMA', webhook);

    expect(global.fetch).toHaveBeenCalledWith(`${webhook}?wait=true`, expect.objectContaining({ method: 'POST' }));
    expect(prisma.office.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { discordBoardMessageId: 'msg-1' },
    });
  });

  it('既存メッセージがあれば編集する', async () => {
    prisma.office.findUnique.mockResolvedValue(office('msg-1'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as any;

    await updateAttendanceBoard('OKAYAMA', webhook);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      `${webhook}/messages/msg-1`,
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('メッセージが削除されていたら作り直す', async () => {
    prisma.office.findUnique.mockResolvedValue(office('msg-old'));
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 'msg-new' }) }) as any;

    await updateAttendanceBoard('OKAYAMA', webhook);

    expect(prisma.office.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { discordBoardMessageId: 'msg-new' },
    });
  });

  it('失敗しても例外を投げない', async () => {
    prisma.office.findUnique.mockRejectedValue(new Error('db down'));

    await expect(updateAttendanceBoard('OKAYAMA', webhook)).resolves.toBeUndefined();
  });
});
