const prisma = jest.requireMock('@/lib/prisma').prisma as any;
let testSendMail: any;
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
  const getSendMail = () => testSendMail;
  const createTransport = jest.fn(() => ({
    get sendMail() {
      return getSendMail();
    },
  }));
  return {
    __esModule: true,
    createTransport,
    default: { createTransport },
  };
});

describe('POST /api/users/reset-password-request', () => {
  beforeEach(() => {
    testSendMail = jest.fn().mockResolvedValue({});
  });
  it('500: prisma.user.updateが失敗した場合はエラー', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'a@b.c' });
    prisma.user.update.mockRejectedValue(new Error('update error'));
    const req = { json: async () => ({ email: 'a@b.c' }) } as any;
    await expect(resetRequest(req)).rejects.toThrow('update error');
  });

  it('500: メール送信失敗時はエラー', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, email: 'a@b.c' });
    prisma.user.update.mockResolvedValue({});
    testSendMail.mockRejectedValueOnce(new Error('mail error'));
    const req = { json: async () => ({ email: 'a@b.c' }) } as any;
    await expect(resetRequest(req)).rejects.toThrow('mail error');
  });
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
    testSendMail.mockResolvedValueOnce({});
    const req = { json: async () => ({ email: 'a@b.c' }) } as any;
    const res = await resetRequest(req);
    expect(res.status).toBe(200);
  });
});
