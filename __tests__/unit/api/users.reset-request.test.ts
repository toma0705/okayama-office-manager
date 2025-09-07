import { POST as resetRequest } from '@/app/api/users/reset-password-request/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue({});
  const createTransport = jest.fn(() => ({ sendMail }));
  return {
    __esModule: true,
    default: { createTransport },
    createTransport,
  };
});

const prisma = jest.requireMock('@/lib/prisma').prisma as any;

describe('POST /api/users/reset-password-request', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400: email不足', async () => {
    const req = { json: async () => ({}) } as any;
    const res = await resetRequest(req);
    expect(res.status).toBe(400);
  });

  it('200: ユーザー未存在でも成功', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const req = { json: async () => ({ email: 'a@b.c' }) } as any;
    const res = await resetRequest(req);
    expect(res.status).toBe(200);
  });

  it('200: ユーザー存在時も成功（メール送信モック）', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'a@b.c' });
    prisma.user.update.mockResolvedValue({});
    const req = { json: async () => ({ email: 'a@b.c' }) } as any;
    const res = await resetRequest(req);
    expect(res.status).toBe(200);
  });
});
