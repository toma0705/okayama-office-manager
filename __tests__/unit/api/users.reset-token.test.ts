import { NextRequest } from 'next/server';
import { POST as resetToken } from '@/app/api/users/reset-password/[token]/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({ hash: jest.fn(() => 'hashed') }));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;

describe('POST /api/users/reset-password/[token]', () => {
  beforeEach(() => jest.resetAllMocks());

  it('400: パスワード/トークン不足', async () => {
    const req = new NextRequest('http://localhost/api/users/reset-password/x', {
      method: 'POST',
      body: JSON.stringify({}),
    } as any);
    const context: any = { params: Promise.resolve({ token: '' }) };
    const res = await resetToken(req, context);
    expect(res.status).toBe(400);
  });

  it('400: トークン無効', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/users/reset-password/x', {
      method: 'POST',
      body: JSON.stringify({ password: 'newpw' }),
    } as any);
    const context: any = { params: Promise.resolve({ token: 'bad' }) };
    const res = await resetToken(req, context);
    expect(res.status).toBe(400);
  });

  it('200: パスワード更新成功', async () => {
    prisma.user.findFirst.mockResolvedValue({ id: 1 });
    prisma.user.update.mockResolvedValue({ id: 1 });
    const req = new NextRequest('http://localhost/api/users/reset-password/x', {
      method: 'POST',
      body: JSON.stringify({ password: 'newpw' }),
    } as any);
    const context: any = { params: Promise.resolve({ token: 'good' }) };
    const res = await resetToken(req, context);
    const json: any = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toContain('リセット');
  });
});
