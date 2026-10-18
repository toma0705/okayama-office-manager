import { NextRequest } from 'next/server';
import { POST as issueToken } from '@/app/api/users/attendance-token/route';
import { GET as getStatus } from '@/app/api/users/attendance-status/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  ATTENDANCE_TOKEN_EXPIRES_IN: '365d',
  getAuthenticatedUserId: jest.fn(),
  getAttendanceUserId: jest.fn(),
  signAttendanceToken: jest.fn((id: number) => `attendance-token-${id}`),
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const auth = jest.requireMock('@/lib/auth') as any;

const req = (url: string) =>
  new NextRequest(url, { headers: { Authorization: 'Bearer x' } as any });

describe('POST /api/users/attendance-token', () => {
  beforeEach(() => jest.clearAllMocks());

  it('401: ログイン用トークンでない(未ログイン・専用トークン)', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(null);
    const res = await issueToken(req('http://localhost/api/users/attendance-token'));
    expect(res.status).toBe(401);
    expect(auth.signAttendanceToken).not.toHaveBeenCalled();
  });

  it('401: トークン検証失敗', async () => {
    auth.getAuthenticatedUserId.mockImplementation(() => {
      throw new Error('invalid');
    });
    const res = await issueToken(req('http://localhost/api/users/attendance-token'));
    expect(res.status).toBe(401);
  });

  it('404: ユーザーが存在しない', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(1);
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await issueToken(req('http://localhost/api/users/attendance-token'));
    expect(res.status).toBe(404);
  });

  it('200: 専用トークンを発行', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(1);
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    const res = await issueToken(req('http://localhost/api/users/attendance-token'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ token: 'attendance-token-1', expiresIn: '365d' });
  });
});

describe('GET /api/users/attendance-status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('401: トークンなし', async () => {
    auth.getAttendanceUserId.mockReturnValue(null);
    const res = await getStatus(req('http://localhost/api/users/attendance-status'));
    expect(res.status).toBe(401);
  });

  it('404: ユーザーが存在しない', async () => {
    auth.getAttendanceUserId.mockReturnValue(1);
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await getStatus(req('http://localhost/api/users/attendance-status'));
    expect(res.status).toBe(404);
  });

  it('200: 在室状態を返す', async () => {
    auth.getAttendanceUserId.mockReturnValue(1);
    prisma.user.findUnique.mockResolvedValue({ entered: true });
    const res = await getStatus(req('http://localhost/api/users/attendance-status'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ entered: true });
  });
});
