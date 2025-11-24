import { NextRequest } from 'next/server';

describe('POST /api/notify', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const okayamaWebhook = 'https://discord.com/api/webhooks/okayama';
  const tokyoWebhook = 'https://discord.com/api/webhooks/tokyo';
  const osakaWebhook = 'https://discord.com/api/webhooks/osaka';
  let notifyPost: typeof import('@/app/api/notify/route').POST;

  beforeEach(async () => {
    jest.resetModules();
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

  const buildRequest = (body: Record<string, unknown>) =>
    new NextRequest('http://localhost/api/notify', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

  it('Tokyoオフィスの通知は東京用Webhookに送信する', async () => {
    const req = buildRequest({ user: '東京ユーザー', status: '入室', officeCode: 'TOKYO' });

    const res = await notifyPost(req);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(tokyoWebhook, expect.any(Object));

    const [, options] = (global.fetch as jest.Mock).mock.calls.at(-1) ?? [];
    const payload = JSON.parse(options.body as string);
    expect(payload.content).toBe('東京ユーザー さんが 入室 しました！');
  });

  it('未定義オフィスはデフォルトWebhookに送信する', async () => {
    const req = buildRequest({ user: '福岡ユーザー', status: '退室', officeCode: 'Fukuoka' });

    const res = await notifyPost(req);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(okayamaWebhook, expect.any(Object));

    const [, options] = (global.fetch as jest.Mock).mock.calls.at(-1) ?? [];
    const payload = JSON.parse(options.body as string);
    expect(payload.content).toBe('福岡ユーザー さんが 退室 しました！');
  });

  it('環境変数があれば新オフィス用Webhookに送信できる', async () => {
    process.env.DISCORD_WEBHOOK_URL_OSAKA = osakaWebhook;
    jest.resetModules();
    ({ POST: notifyPost } = await import('@/app/api/notify/route'));

    const req = buildRequest({
      user: '大阪ユーザー',
      status: '入室',
      officeCode: 'osaka',
      note: '大阪拠点で商談中',
    });

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

    const req = buildRequest({ user: '誰か', status: '入室', officeCode: 'TOKYO' });

    const res = await notifyPost(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('DISCORD_WEBHOOK_URL_DEFAULT');
  });
});
