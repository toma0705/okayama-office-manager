import {
  GET as getUser,
  DELETE as deleteUser,
  PATCH as patchUser,
} from '@/app/api/users/[id]/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const fs = jest.requireMock('fs/promises') as any;

describe('GET/DELETE/PATCH /api/users/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

  it('GET: 404 未存在', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await getUser({} as any, ctx(999));
    expect(res.status).toBe(404);
  });

  it('GET: 200 取得成功', async () => {
    const user = { id: 1, name: 'A' };
    prisma.user.findUnique.mockResolvedValue(user);
    const res = await getUser({} as any, ctx(1));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(user);
  });

  it('DELETE: 200 削除成功（画像があればunlink試行）', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, iconFileName: 'icon.png' });
    prisma.user.delete.mockResolvedValue({});
    const res = await deleteUser({} as any, ctx(1));
    expect(res.status).toBe(200);
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('PATCH: 200 更新成功', async () => {
    const updated = { id: 2, note: 'hello' };
    prisma.user.update.mockResolvedValue(updated);
    const req = { json: async () => ({ note: 'hello' }) } as any;
    const res = await patchUser(req, ctx(2));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(updated);
  });
});
