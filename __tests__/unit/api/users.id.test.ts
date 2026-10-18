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

jest.mock('@/lib/auth', () => ({ getAuthenticatedUserId: jest.fn() }));

jest.mock('@/lib/storage', () => ({
  removeUserIconByUrl: jest.fn(),
  resolveUserIconUrl: jest.fn((value: string) => `https://cdn.example.com/${value}`),
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const storage = jest.requireMock('@/lib/storage');
const auth = jest.requireMock('@/lib/auth') as any;

describe('GET/DELETE/PATCH /api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    auth.getAuthenticatedUserId.mockReturnValue(1);
  });

  const ctx = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

  it.each([
    ['GET', () => getUser({} as any, ctx(1))],
    ['DELETE', () => deleteUser({} as any, ctx(1))],
    ['PATCH', () => patchUser({ json: async () => ({ note: 'x' }) } as any, ctx(1))],
  ])('%s: 401 未ログイン', async (_, call) => {
    auth.getAuthenticatedUserId.mockReturnValue(null);
    const res = await call();
    expect(res.status).toBe(401);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([
    ['GET', () => getUser({} as any, ctx(2))],
    ['DELETE', () => deleteUser({} as any, ctx(2))],
    ['PATCH', () => patchUser({ json: async () => ({ note: 'x' }) } as any, ctx(2))],
  ])('%s: 403 他のユーザー', async (_, call) => {
    const res = await call();
    expect(res.status).toBe(403);
    expect(prisma.user.delete).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('DELETE: 401 トークン検証失敗', async () => {
    auth.getAuthenticatedUserId.mockImplementation(() => {
      throw new Error('invalid');
    });
    const res = await deleteUser({} as any, ctx(1));
    expect(res.status).toBe(401);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('GET: パスワードと再設定トークンは返さない', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: 'A',
      iconFileName: 'a.png',
      password: 'hash',
      resetToken: 'reset',
      resetTokenExpires: new Date(),
    });
    const res = await getUser({} as any, ctx(1));
    const json = await res.json();
    expect(json.password).toBeUndefined();
    expect(json.resetToken).toBeUndefined();
    expect(json.resetTokenExpires).toBeUndefined();
  });

  it('PATCH: 400 note が文字列でない', async () => {
    const res = await patchUser({ json: async () => ({ note: 123 }) } as any, ctx(1));
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('GET: 404 未存在', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    auth.getAuthenticatedUserId.mockReturnValue(999);
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
    const updated = { id: 1, note: 'hello' };
    prisma.user.update.mockResolvedValue(updated);
    const req = { json: async () => ({ note: 'hello' }) } as any;
    const res = await patchUser(req, ctx(1));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(updated);
  });
});
