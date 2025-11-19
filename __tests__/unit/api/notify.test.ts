import { NextRequest } from 'next/server';

describe('POST /api/notify', () => {
  const originalEnv = process.env;
  const okayamaWebhook = 'https://discord.com/api/webhooks/okayama';
  const tokyoWebhook = 'https://discord.com/api/webhooks/tokyo';
  let notifyPost: typeof import('@/app/api/notify/route').POST;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.DISCORD_WEBHOOK_URL_OKAYAMA = okayamaWebhook;
    process.env.DISCORD_WEBHOOK_URL_TOKYO = tokyoWebhook;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
    ({ POST: notifyPost } = await import('@/app/api/notify/route'));
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
  });

  it('その他オフィスの通知はデフォルトWebhookに送信する', async () => {
    const req = buildRequest({ user: '岡山ユーザー', status: '退室', officeCode: 'OKAYAMA' });

    const res = await notifyPost(req);

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(okayamaWebhook, expect.any(Object));
  });

  it('デフォルトWebhook未設定時は500を返す', async () => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DISCORD_WEBHOOK_URL_OKAYAMA;
    process.env.DISCORD_WEBHOOK_URL_TOKYO = tokyoWebhook;
    global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;
    ({ POST: notifyPost } = await import('@/app/api/notify/route'));

    const req = buildRequest({ user: '誰か', status: '入室', officeCode: 'TOKYO' });

    const res = await notifyPost(req);

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('DISCORD_WEBHOOK_URL_OKAYAMA');
  });
});
