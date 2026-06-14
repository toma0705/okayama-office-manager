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

jest.mock('@/lib/storage', () => ({
  removeUserIconByUrl: jest.fn(),
  resolveUserIconUrl: jest.fn((value: string) => `https://cdn.example.com/${value}`),
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const storage = jest.requireMock('@/lib/storage');

describe('GET/DELETE/PATCH /api/users/[id]', () => {
  beforeEach(() => jest.clearAllMocks());

  const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

  it('GET: 404 未存在', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const res = await getUser({} as any, ctx(999));
    expect(res.status).toBe(404);
  });

  it('GET: 200 取得成功', async () => {
    const user = { id: 1, name: 'A', iconFileName: 'a.png' };
    prisma.user.findUnique.mockResolvedValue(user);
    const res = await getUser({} as any, ctx(1));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ...user, iconFileName: 'https://cdn.example.com/a.png' });
  });

  it('DELETE: 200 削除成功（保存URLから削除）', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, iconFileName: 'icon.png' });
    storage.removeUserIconByUrl.mockResolvedValue({ removed: true, storagePath: 'icon.png' });
    prisma.user.delete.mockResolvedValue({});
    const res = await deleteUser({} as any, ctx(1));
    expect(res.status).toBe(200);
    expect(storage.removeUserIconByUrl).toHaveBeenCalledWith('icon.png');
  });

  it('DELETE: ストレージ上の画像はストレージから削除する', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1, iconFileName: 'icon.png' });
    storage.removeUserIconByUrl.mockResolvedValue({
      removed: true,
      storagePath: 'icon.png',
    });
    prisma.user.delete.mockResolvedValue({});

    const res = await deleteUser({} as any, ctx(1));
    expect(res.status).toBe(200);
    expect(storage.removeUserIconByUrl).toHaveBeenCalledWith('icon.png');
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
