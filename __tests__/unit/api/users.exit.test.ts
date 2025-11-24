import { NextRequest } from 'next/server';
import { POST as exit } from '@/app/api/users/[id]/exit/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;

describe('POST /api/users/[id]/exit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('正常系: 退室に成功', async () => {
  prisma.user.findUnique.mockResolvedValue({ id: 1, entered: true, note: 'テストメモ' });
    prisma.user.update.mockResolvedValue({ id: 1, entered: false });

    const req = new NextRequest('http://localhost/api/users/1/exit', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: '1' }) };

    const res = await exit(req, context);
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('退室しました');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        entered: false,
        note: null,
        exitedAt: expect.any(Date),
      }),
    });
  });

  it('不正ID: 400', async () => {
    const req = new NextRequest('http://localhost/api/users/xxx/exit', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: 'xxx' }) };

    const res = await exit(req, context);
    expect(res.status).toBe(400);
  });

  it('ユーザー未存在: 404', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/users/2/exit', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: '2' }) };

    const res = await exit(req, context);
    const json: any = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toContain('見つかりません');
  });

  it('すでに退室済み: 400', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 3, entered: false });

    const req = new NextRequest('http://localhost/api/users/3/exit', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: '3' }) };

    const res = await exit(req, context);
    const json: any = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('退室済み');
  });
});
