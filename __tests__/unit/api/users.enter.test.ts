import { NextRequest } from 'next/server';
import { POST as enter } from '@/app/api/users/[id]/enter/route';

jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: jest.fn(() => 1),
}));

jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, entered: false, exitPendingSince: null }),
        update: jest.fn().mockResolvedValue({ id: 1, entered: true }),
      },
    },
  };
});

describe('POST /api/users/[id]/enter', () => {
  it('正常系: 入室に成功', async () => {
    const req = new NextRequest('http://localhost/api/users/1/enter', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: '1' }) };

    const res = await enter(req, context);
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('入室しました');
  });

  it('不正ID: 400', async () => {
    const req = new NextRequest('http://localhost/api/users/xxx/enter', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: 'xxx' }) };

    const res = await enter(req, context);
    const json: any = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('不正なID');
  });

  it('403: 他ユーザーの入室操作は拒否', async () => {
    const auth = jest.requireMock('@/lib/auth') as any;
    auth.getAuthenticatedUserId.mockReturnValueOnce(99);

    const req = new NextRequest('http://localhost/api/users/1/enter', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: '1' }) };

    const res = await enter(req, context);
    expect(res.status).toBe(403);
  });

  it('退室の保留中なら保留を取り消すだけで、入室の時刻は変えない', async () => {
    const prisma = jest.requireMock('@/lib/prisma').prisma as any;
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 1,
      entered: true,
      exitPendingSince: new Date('2026-10-28T09:00:00Z'),
    });
    prisma.user.update.mockClear();

    const req = new NextRequest('http://localhost/api/users/1/enter', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: '1' }) };

    const res = await enter(req, context);
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.resumed).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { exitPendingSince: null },
    });
  });
});
