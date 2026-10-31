import { NextRequest } from 'next/server';

const mockFindUnique = jest.fn();
jest.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: (...args: unknown[]) => mockFindUnique(...args) } } }));
const mockGetAuthenticatedUserId = jest.fn();
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: (...args: unknown[]) => mockGetAuthenticatedUserId(...args),
}));
const mockPostAttendance = jest.fn();
jest.mock('@/lib/discord', () => ({
  ...jest.requireActual('@/lib/discord'),
  postAttendanceMessage: (...args: unknown[]) => mockPostAttendance(...args),
}));

describe('POST /api/notify', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const okayamaWebhook = 'https://discord.com/api/webhooks/okayama';
  const tokyoWebhook = 'https://discord.com/api/webhooks/tokyo';
  const osakaWebhook = 'https://discord.com/api/webhooks/osaka';
  let notifyPost: typeof import('@/app/api/notify/route').POST;

  beforeEach(async () => {
    jest.resetModules();
    mockPostAttendance.mockReset();
    mockFindUnique.mockReset();
    mockGetAuthenticatedUserId.mockReset();
    mockGetAuthenticatedUserId.mockReturnValue(1);
    process.env = { ...originalEnv };
    process.env.DISCORD_WEBHOOK_URL_OKAYAMA = okayamaWebhook;
    process.env.DISCORD_WEBHOOK_URL_TOKYO = tokyoWebhook;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    ({ POST: notifyPost } = await import('@/app/api/notify/route'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // 名前とオフィスは送信内容ではなく、トークンのユーザー(DB)から決まる
  const sender = (name: string, officeCode: string) =>
    mockFindUnique.mockResolvedValue({ name, office: { code: officeCode } });

  const buildRequest = (body: Record<string, unknown>) =>
    new NextRequest('http://localhost/api/notify', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

  it('Tokyoオフィスの通知は東京用Webhookに送信する', async () => {
    sender('東京ユーザー', 'TOKYO');
    const req = buildRequest({ status: '入室' });

    const res = await notifyPost(req);

    expect(res.status).toBe(200);
    expect(mockPostAttendance).toHaveBeenCalledWith(
      'TOKYO',
      tokyoWebhook,
      '東京ユーザー さんが 入室 しました！',
    );
  });

  it('未定義オフィスはデフォルトWebhookに送信する', async () => {
    sender('福岡ユーザー', 'Fukuoka');
    const req = buildRequest({ status: '退室' });

    const res = await notifyPost(req);

    expect(res.status).toBe(200);
    expect(mockPostAttendance).toHaveBeenCalledWith(
      'Fukuoka',
      okayamaWebhook,
      '福岡ユーザー さんが 退室 しました！',
    );
  });

  it('環境変数があれば新オフィス用Webhookに送信できる', async () => {
    process.env.DISCORD_WEBHOOK_URL_OSAKA = osakaWebhook;
    jest.resetModules();
    ({ POST: notifyPost } = await import('@/app/api/notify/route'));

    sender('大阪ユーザー', 'osaka');
    const req = buildRequest({ status: 'メモを追加', note: '大阪拠点で商談中' });

    const res = await notifyPost(req);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(osakaWebhook, expect.any(Object));

    const [, options] = (global.fetch as jest.Mock).mock.calls.at(-1) ?? [];
    const payload = JSON.parse(options.body as string);
    expect(payload.content).toBe('大阪ユーザー さんのメモ: 大阪拠点で商談中');
  });

  it('デフォルトWebhook未設定時は500を返す', async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DISCORD_WEBHOOK_URL_DEFAULT;
    delete process.env.DISCORD_WEBHOOK_URL_OKAYAMA;
    process.env.DISCORD_WEBHOOK_URL_TOKYO = tokyoWebhook;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    ({ POST: notifyPost } = await import('@/app/api/notify/route'));

    sender('誰か', 'TOKYO');
    const req = buildRequest({ status: '入室' });

    const res = await notifyPost(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('DISCORD_WEBHOOK_URL_DEFAULT');
  });

  it('入退室通知は在室状況を添えて送り、メッセージを別に送らない', async () => {
    sender('A', 'TOKYO');
    await notifyPost(buildRequest({ status: '入室' }));

    expect(mockPostAttendance).toHaveBeenCalledWith('TOKYO', tokyoWebhook, 'A さんが 入室 しました！');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('メモ追加ではメモだけを送り、在室状況は添えない', async () => {
    sender('A', 'TOKYO');
    await notifyPost(buildRequest({ status: 'メモを追加', note: 'hello' }));

    expect(mockPostAttendance).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(tokyoWebhook, expect.any(Object));
  });

  it('401: 未ログインでは通知しない', async () => {
    mockGetAuthenticatedUserId.mockReturnValue(null);
    const res = await notifyPost(buildRequest({ status: '入室' }));
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockPostAttendance).not.toHaveBeenCalled();
  });

  it('送信内容のユーザー名・オフィスは使わない（なりすまし防止）', async () => {
    sender('本人', 'TOKYO');
    await notifyPost(buildRequest({ user: '他人', officeCode: 'OKAYAMA', status: '入室' }));

    expect(mockPostAttendance).toHaveBeenCalledWith('TOKYO', tokyoWebhook, '本人 さんが 入室 しました！');
  });

  it('400: 不正なステータス', async () => {
    sender('A', 'TOKYO');
    const res = await notifyPost(buildRequest({ status: '@everyone' }));
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
