import { NextRequest } from 'next/server';
import { POST as leave } from '@/app/api/users/[id]/leave/route';

jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: jest.fn(() => 1),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const auth = jest.requireMock('@/lib/auth') as any;

const call = (id = '1') =>
  leave(new NextRequest(`http://localhost/api/users/${id}/leave`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  } as any);

describe('POST /api/users/[id]/leave', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('入室中なら退室にせず、保留を始める', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, entered: true, exitPendingSince: null });

    const res = await call();
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe('pending');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { exitPendingSince: expect.any(Date) },
    });
  });

  it('すでに保留中なら、最初に圏外になった時刻を保つ', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      entered: true,
      exitPendingSince: new Date('2026-10-28T09:00:00Z'),
    });

    const res = await call();
    const json: any = await res.json();

    expect(json.status).toBe('pending');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('退室済みなら何もしない', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, entered: false, exitPendingSince: null });

    const res = await call();
    const json: any = await res.json();

    expect(json.status).toBe('exited');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('403: 他ユーザーの退室は操作できない', async () => {
    auth.getAuthenticatedUserId.mockReturnValueOnce(99);

    const res = await call();

    expect(res.status).toBe(403);
  });

  it('不正ID: 400', async () => {
    const res = await call('xxx');

    expect(res.status).toBe(400);
  });
});
