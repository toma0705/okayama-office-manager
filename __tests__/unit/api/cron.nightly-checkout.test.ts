import { NextRequest } from 'next/server';
import { GET as nightlyCheckout } from '@/app/api/cron/nightly-checkout/route';

jest.mock('@/lib/attendance', () => ({
  checkoutAllEntered: jest.fn().mockResolvedValue(3),
}));

const attendance = jest.requireMock('@/lib/attendance') as any;

describe('GET /api/cron/nightly-checkout', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  const call = (authorization?: string) =>
    nightlyCheckout(
      new NextRequest('http://localhost/api/cron/nightly-checkout', {
        headers: authorization ? { Authorization: authorization } : {},
      }),
    );

  it('正しい秘密のキーなら入室中の全員を退室にする', async () => {
    const res = await call('Bearer test-secret');
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.checkedOut).toBe(3);
    expect(attendance.checkoutAllEntered).toHaveBeenCalled();
  });

  it('401: キーが違う', async () => {
    const res = await call('Bearer wrong');

    expect(res.status).toBe(401);
    expect(attendance.checkoutAllEntered).not.toHaveBeenCalled();
  });

  it('401: CRON_SECRET が未設定なら通さない', async () => {
    delete process.env.CRON_SECRET;

    const res = await call('Bearer undefined');

    expect(res.status).toBe(401);
    expect(attendance.checkoutAllEntered).not.toHaveBeenCalled();
  });
});
