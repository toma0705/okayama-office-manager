import { NextRequest, NextResponse } from 'next/server';
import { GET as me } from '@/app/api/users/me/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('jsonwebtoken', () => ({ verify: jest.fn() }));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const jwt = jest.requireMock('jsonwebtoken') as any;

describe('GET /api/users/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401: 認証ヘッダーなし', async () => {
    const req = new NextRequest('http://localhost/api/users/me');
    const res = await me(req);
    expect(res.status).toBe(401);
  });

  it('401: トークン検証失敗', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = new NextRequest('http://localhost/api/users/me', {
      headers: { Authorization: 'Bearer bad' } as any,
    });
    const res = await me(req);
    expect(res.status).toBe(401);
  });

  it('404: ユーザーが見つからない', async () => {
    jwt.verify.mockReturnValue({ id: 1 });
    prisma.user.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/users/me', {
      headers: { Authorization: 'Bearer ok' } as any,
    });
    const res = await me(req);
    expect(res.status).toBe(404);
  });

  it('200: ユーザーと入室者一覧を返す', async () => {
    jwt.verify.mockReturnValue({ id: 1 });
    prisma.user.findUnique.mockResolvedValue({ id: 1, name: 'A' });
    prisma.user.findMany.mockResolvedValue([{ id: 2, name: 'B', entered: true }]);
    const req = new NextRequest('http://localhost/api/users/me', {
      headers: { Authorization: 'Bearer ok' } as any,
    });
    const res = await me(req);
    const json: any = await res.json();
    expect(res.status).toBe(200);
    expect(json.user.id).toBe(1);
    expect(Array.isArray(json.enteredUsers)).toBeTruthy();
  });
});
