import { GET as officesGet } from '@/app/api/offices/route';

jest.mock('@/lib/prisma', () => ({ prisma: { office: { findMany: jest.fn() } } }));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;

describe('GET /api/offices', () => {
  it('オフィスの一覧を ID 順に返す', async () => {
    const offices = [
      { id: 1, code: 'OKAYAMA', name: '岡山オフィス' },
      { id: 2, code: 'TOKYO', name: '東京オフィス' },
    ];
    prisma.office.findMany.mockResolvedValue(offices);

    const res = await officesGet();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(offices);
    expect(prisma.office.findMany).toHaveBeenCalledWith({
      select: { id: true, code: true, name: true },
      orderBy: { id: 'asc' },
    });
  });

  it('500: DB のエラーは詳細を返さない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.office.findMany.mockRejectedValue(new Error('db down'));

    const res = await officesGet();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'オフィス一覧の取得に失敗しました' });
  });
});
