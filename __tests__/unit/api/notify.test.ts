import { POST as notifyPost } from '@/app/api/notify/route';

describe('POST /api/notify', () => {
  it('200: Discord Webhookが呼ばれる', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (global as any).fetch = fetchMock;
    const req = { json: async () => ({ user: 'テストユーザー', status: '入室' }) } as any;
    const res = await notifyPost(req);
    expect(fetchMock).toHaveBeenCalledWith(
      process.env.DISCORD_WEBHOOK_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'テストユーザー さんが 入室 しました！' }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it('500: fetch失敗時はエラー', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('fail'));
    const req = { json: async () => ({ user: 'テストユーザー', status: '入室' }) } as any;
    await expect(notifyPost(req)).rejects.toThrow();
  });
});
