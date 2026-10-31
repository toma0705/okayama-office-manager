/**
 * 入退室の 4 つのルート（enter / exit / arrive / leave）に共通する入力・認証のチェック。
 * 状態ごとの動きは __tests__/unit/lib/attendance.test.ts と各ルートのテストで確かめる。
 */
import { NextRequest } from 'next/server';
import { POST as arrive } from '@/app/api/users/[id]/arrive/route';
import { POST as enter } from '@/app/api/users/[id]/enter/route';
import { POST as exit } from '@/app/api/users/[id]/exit/route';
import { POST as leave } from '@/app/api/users/[id]/leave/route';

jest.mock('@/lib/auth', () => ({ getAuthenticatedUserId: jest.fn() }));
jest.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: jest.fn(), update: jest.fn() } },
}));

const auth = jest.requireMock('@/lib/auth') as { getAuthenticatedUserId: jest.Mock };
const prisma = jest.requireMock('@/lib/prisma').prisma as any;

const routes = { arrive, enter, exit, leave };
const call = (name: keyof typeof routes, id = '1') =>
  routes[name](new NextRequest(`http://localhost/api/users/${id}/${name}`, { method: 'POST' }), {
    params: Promise.resolve({ id }),
  });

describe.each(Object.keys(routes) as (keyof typeof routes)[])('POST /api/users/[id]/%s', name => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.getAuthenticatedUserId.mockReturnValue(1);
  });

  it('400: ID が数値でない', async () => {
    expect((await call(name, 'abc')).status).toBe(400);
  });

  it('401: トークンがない', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(null);
    expect((await call(name)).status).toBe(401);
  });

  it('401: トークンが不正・期限切れ（アプリが再ログインを促せるよう 500 にしない）', async () => {
    auth.getAuthenticatedUserId.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    expect((await call(name)).status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('403: 他のユーザーは操作できない', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(99);
    expect((await call(name)).status).toBe(403);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('404: ユーザーが見つからない', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    expect((await call(name)).status).toBe(404);
  });

  it('500: DB のエラーは詳細を返さない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.user.findUnique.mockRejectedValue(new Error('db down'));
    const res = await call(name);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('db down');
  });
});
