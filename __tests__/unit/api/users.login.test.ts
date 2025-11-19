import { POST as login } from '@/app/api/users/login/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
jest.mock('jsonwebtoken', () => {
  const sign = jest.fn(() => 'dummy.jwt.token');
  return {
    __esModule: true,
    default: { sign },
    sign,
  };
});

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const bcrypt = jest.requireMock('bcryptjs') as any;

describe('POST /api/users/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('400: email/passwordが無い', async () => {
    const req = { json: async () => ({}) } as any;
    const res = await login(req);
    expect(res.status).toBe(400);
  });

  it('401: ユーザー未存在', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const req = { json: async () => ({ email: 'a@b.c', password: 'pw' }) } as any;
    const res = await login(req);
    expect(res.status).toBe(401);
  });

  it('401: パスワード不一致', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 1,
      name: 'A',
      password: 'hash',
      iconFileName: 'x.png',
      officeId: 1,
      office: { id: 1, code: 'OKAYAMA', name: '岡山オフィス' },
    });
    bcrypt.compare.mockResolvedValue(false);
    const req = { json: async () => ({ email: 'a@b.c', password: 'pw' }) } as any;
    const res = await login(req);
    expect(res.status).toBe(401);
  });

  it('200: 成功でtoken返す', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 1,
      name: 'A',
      password: 'hash',
      iconFileName: 'x.png',
      officeId: 1,
      office: { id: 1, code: 'OKAYAMA', name: '岡山オフィス' },
    });
    bcrypt.compare.mockResolvedValue(true);
    const req = { json: async () => ({ email: 'a@b.c', password: 'pw' }) } as any;
    const res = await login(req);
    const json: any = await res.json();
    expect(res.status).toBe(200);
    expect(json.token).toBeDefined();
    expect(json.user.password).toBeUndefined();
    expect(json.user.office.code).toBe('OKAYAMA');
  });
});
