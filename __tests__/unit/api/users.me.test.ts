import { NextRequest } from 'next/server';
import { GET as me } from '@/app/api/users/me/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: jest.fn(),
}));

jest.mock('@/lib/attendance', () => ({
  settlePendingAttendance: jest.fn().mockResolvedValue({ entered: 0, exited: 0 }),
}));

jest.mock('@/lib/storage', () => ({
  resolveUserIconUrl: jest.fn((value: string) => `https://example.r2.dev/${value}`),
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const auth = jest.requireMock('@/lib/auth') as any;
const attendance = jest.requireMock('@/lib/attendance') as any;

describe('GET /api/users/me', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('401: 認証ヘッダーなし', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(null);
    const req = new NextRequest('http://localhost/api/users/me');
    const res = await me(req);
    expect(res.status).toBe(401);
  });

  it('401: トークン検証失敗', async () => {
    auth.getAuthenticatedUserId.mockImplementation(() => {
      throw new Error('invalid');
    });
    const req = new NextRequest('http://localhost/api/users/me', {
      headers: { Authorization: 'Bearer bad' } as any,
    });
    const res = await me(req);
    expect(res.status).toBe(401);
  });

  it('404: ユーザーが見つからない', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(1);
    prisma.user.findUnique.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/users/me', {
      headers: { Authorization: 'Bearer ok' } as any,
    });
    const res = await me(req);
    expect(res.status).toBe(404);
  });

  it('200: ユーザーと入室者一覧を返す', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(1);
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'A',
      iconFileName: 'me.png',
      officeId: 1,
      office: {
        id: 1,
        code: 'OKAYAMA',
        name: '岡山オフィス',
      },
    });
    prisma.user.findMany.mockResolvedValue([
      {
        id: 2,
        name: 'B',
        iconFileName: 'entered.png',
        entered: true,
        officeId: 1,
        office: {
          id: 1,
          code: 'OKAYAMA',
          name: '岡山オフィス',
        },
      },
    ]);
    const req = new NextRequest('http://localhost/api/users/me', {
      headers: { Authorization: 'Bearer ok' } as any,
    });
    const res = await me(req);
    const json: any = await res.json();
    expect(res.status).toBe(200);
    expect(json.user.id).toBe(1);
    expect(json.user.iconFileName).toBe('https://example.r2.dev/me.png');
    expect(Array.isArray(json.enteredUsers)).toBeTruthy();
    expect(json.enteredUsers[0].iconFileName).toBe('https://example.r2.dev/entered.png');
  });

  it('時間を過ぎた入退室の保留を確定してから返し、確定に失敗しても在室状況は返す', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(1);
    attendance.settlePendingAttendance.mockRejectedValueOnce(new Error('db down'));
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'A',
      iconFileName: 'me.png',
      officeId: 1,
      office: { id: 1, code: 'OKAYAMA', name: '岡山オフィス' },
    });
    prisma.user.findMany.mockResolvedValue([]);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const req = new NextRequest('http://localhost/api/users/me', {
      headers: { Authorization: 'Bearer ok' } as any,
    });
    const res = await me(req);

    expect(attendance.settlePendingAttendance).toHaveBeenCalled();
    expect(res.status).toBe(200);
    warn.mockRestore();
  });
});
