jest.mock('@/lib/prisma', () => ({
  prisma: { office: { findUnique: jest.fn() } },
}));

import { buildPresenceEmbed, postAttendanceMessage, postDiscordMessage } from '@/lib/discord';

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const webhook = 'https://discord.com/api/webhooks/1/token';
const enteredAt = new Date('2026-10-03T01:30:00Z');
const unix = Math.floor(enteredAt.getTime() / 1000);

describe('buildPresenceEmbed', () => {
  it('在室者の名前と入室時刻を並べ、人数をタイトルに出す', () => {
    const embed = buildPresenceEmbed('岡山オフィス', [{ name: '山田', enteredAt }]);

    expect(embed.title).toBe('📍 岡山オフィスの在室状況（1人）');
    expect(embed.description).toContain('**山田**');
    expect(embed.description).toContain(`<t:${unix}:t>〜`);
  });

  it('誰もいないときはその旨を表示する', () => {
    const embed = buildPresenceEmbed('岡山オフィス', []);

    expect(embed.title).toBe('📍 岡山オフィスの在室状況（0人）');
    expect(embed.description).toBe('現在、誰もいません');
  });
});

describe('postAttendanceMessage', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('入退室のメッセージに、そのときの在室状況を添えて 1 通で送る', async () => {
    prisma.office.findUnique.mockResolvedValue({
      name: '岡山オフィス',
      users: [{ name: '山田', enteredAt }],
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await postAttendanceMessage('OKAYAMA', webhook, '佐藤 さんが 退室 しました！');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(webhook);
    expect(options.method).toBe('POST');
    const body = JSON.parse(options.body);
    expect(body.content).toBe('佐藤 さんが 退室 しました！');
    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0].title).toBe('📍 岡山オフィスの在室状況（1人）');
    expect(body.allowed_mentions).toEqual({ parse: [] });
  });

  it('オフィスが見つからなくてもメッセージは送る', async () => {
    prisma.office.findUnique.mockResolvedValue(null);
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await postAttendanceMessage('UNKNOWN', webhook, 'A さんが 入室 しました！');

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.content).toBe('A さんが 入室 しました！');
    expect(body.embeds).toEqual([]);
  });

  it('在室状況が取れなくても、入退室のメッセージは送る', async () => {
    prisma.office.findUnique.mockRejectedValue(new Error('db down'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(
      postAttendanceMessage('OKAYAMA', webhook, 'A さんが 入室 しました！'),
    ).resolves.toBeUndefined();

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.content).toBe('A さんが 入室 しました！');
    expect(body.embeds).toEqual([]);
    warn.mockRestore();
  });
});

describe('postDiscordMessage', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('メンションを鳴らさない設定で送る', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    await postDiscordMessage(webhook, '@everyone こんにちは');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe(webhook);
    expect(JSON.parse(options.body)).toEqual({
      content: '@everyone こんにちは',
      embeds: [],
      allowed_mentions: { parse: [] },
    });
  });

  it('Discord がエラーを返しても、通信に失敗しても、エラーを投げない', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
    await expect(postDiscordMessage(webhook, 'a')).resolves.toBeUndefined();

    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
    await expect(postDiscordMessage(webhook, 'a')).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledTimes(2);
  });
});
