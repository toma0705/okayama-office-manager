import { NextRequest } from 'next/server';
import { GET as finalizeExits } from '@/app/api/cron/finalize-exits/route';

jest.mock('@/lib/attendance', () => ({
  finalizePendingExits: jest.fn().mockResolvedValue(2),
}));

const attendance = jest.requireMock('@/lib/attendance') as any;

describe('GET /api/cron/finalize-exits', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  const call = (authorization?: string) =>
    finalizeExits(
      new NextRequest('http://localhost/api/cron/finalize-exits', {
        headers: authorization ? { Authorization: authorization } : {},
      }),
    );

  it('正しい秘密のキーなら退室を確定する', async () => {
    const res = await call('Bearer test-secret');
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.finalized).toBe(2);
    expect(attendance.finalizePendingExits).toHaveBeenCalled();
  });

  it('401: キーが違う', async () => {
    const res = await call('Bearer wrong');

    expect(res.status).toBe(401);
    expect(attendance.finalizePendingExits).not.toHaveBeenCalled();
  });

  it('401: CRON_SECRET が未設定なら、ヘッダーがなくても通さない', async () => {
    delete process.env.CRON_SECRET;

    const res = await call('Bearer undefined');

    expect(res.status).toBe(401);
    expect(attendance.finalizePendingExits).not.toHaveBeenCalled();
  });
});
