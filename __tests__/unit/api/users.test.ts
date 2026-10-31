import { NextRequest } from 'next/server';
import { GET as usersGet, POST as usersPost } from '@/app/api/users/route';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    office: { findUnique: jest.fn() },
  },
}));
jest.mock('@/lib/auth', () => ({ getAuthenticatedUserId: jest.fn() }));
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'hashed_pw') }));
jest.mock('@/lib/storage', () => ({
  MAX_ICON_SIZE_BYTES: 200 * 1024,
  uploadUserIcon: jest.fn(),
  resolveUserIconUrl: jest.fn((value: string) => `https://example.r2.dev/${value}`),
}));
// 圧縮は utils/image のテストで確かめるので、ここでは結果だけを差し替える
jest.mock('@/utils/image', () => ({
  isSupportedImageType: jest.requireActual('@/utils/image').isSupportedImageType,
  compressImageToLimit: jest.fn(),
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const auth = jest.requireMock('@/lib/auth') as any;
const storage = jest.requireMock('@/lib/storage') as any;
const image = jest.requireMock('@/utils/image') as any;

const MAX = 200 * 1024;
const tokyo = { id: 2, code: 'TOKYO', name: '東京オフィス' };

const getRequest = (query = '') =>
  new NextRequest(`http://localhost/api/users${query}`, {
    headers: { Authorization: 'Bearer token' },
  });

const registerForm = (overrides: Record<string, string | File | null> = {}) => {
  const fields: Record<string, string | File | null> = {
    name: 'Hanako',
    email: 'hanako@4nonome.com',
    password: 'pw',
    officeCode: 'tokyo',
    icon: new File([new Uint8Array(3)], 'icon.png', { type: 'image/png' }),
    ...overrides,
  };
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== null) form.set(key, value);
  return { formData: async () => form } as unknown as NextRequest;
};

describe('GET /api/users', () => {
  beforeEach(() => jest.clearAllMocks());

  it('401: ログインしていなければ一覧を返さない', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(null);
    expect((await usersGet(getRequest())).status).toBe(401);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('200: 一覧を返し、アイコンを URL にする', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(1);
    prisma.user.findMany.mockResolvedValue([
      { id: 1, name: 'A', iconFileName: 'a.png', office: tokyo },
    ]);

    const res = await usersGet(getRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([
      { id: 1, name: 'A', iconFileName: 'https://example.r2.dev/a.png', office: tokyo },
    ]);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });

  it('?officeCode でオフィスを絞り込む（大文字・小文字は区別しない）', async () => {
    auth.getAuthenticatedUserId.mockReturnValue(1);
    prisma.user.findMany.mockResolvedValue([]);

    await usersGet(getRequest('?officeCode=okayama'));
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { office: { code: 'OKAYAMA' } } }),
    );
  });
});

describe('POST /api/users（新規登録）', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.office.findUnique.mockResolvedValue(tokyo);
    image.compressImageToLimit.mockImplementation(async (buffer: Buffer, { mimeType }: any) => ({
      buffer,
      contentType: mimeType,
      extension: 'png',
      wasCompressed: false,
      originalBytes: buffer.length,
    }));
    storage.uploadUserIcon.mockResolvedValue({ storagePath: 'saved.png' });
    // DB からはパスワードのハッシュなども返ってくる
    prisma.user.create.mockImplementation(async ({ data }: any) => ({
      id: 10,
      ...data,
      resetToken: null,
      resetTokenExpires: null,
      office: tokyo,
    }));
  });

  it('201: 登録し、パスワードのハッシュなどは返さない', async () => {
    const res = await usersPost(registerForm());
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json).toEqual({
      id: 10,
      name: 'Hanako',
      email: 'hanako@4nonome.com',
      iconFileName: 'https://example.r2.dev/saved.png',
      officeId: 2,
      office: tokyo,
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ password: 'hashed_pw' }) }),
    );
  });

  it('画像の拡張子はファイル名ではなく形式から決める', async () => {
    image.compressImageToLimit.mockResolvedValueOnce({
      buffer: Buffer.alloc(MAX - 10),
      contentType: 'image/webp',
      extension: 'webp',
      wasCompressed: true,
      originalBytes: MAX + 5000,
    });
    await usersPost(registerForm());

    expect(storage.uploadUserIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/webp',
        fileName: expect.stringMatching(/\.webp$/),
      }),
    );
  });

  it.each([
    ['名前', { name: null }],
    ['メールアドレス', { email: null }],
    ['パスワード', { password: null }],
    ['オフィス', { officeCode: null }],
    ['画像', { icon: null }],
  ])('400: %sがない', async (_label, overrides) => {
    expect((await usersPost(registerForm(overrides))).status).toBe(400);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('400: フォームとして読めない', async () => {
    const req = {
      formData: async () => Promise.reject(new Error('bad')),
    } as unknown as NextRequest;
    expect((await usersPost(req)).status).toBe(400);
  });

  it('400: 団体のドメイン以外のメールアドレス', async () => {
    const res = await usersPost(registerForm({ email: 'mika@example.com' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain('@4nonome.com');
  });

  it('409: メールアドレスが登録済み', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    expect((await usersPost(registerForm())).status).toBe(409);
  });

  it('400: 存在しないオフィスなら、画像を保存せずに断る', async () => {
    prisma.office.findUnique.mockResolvedValue(null);
    const res = await usersPost(registerForm({ officeCode: 'OSAKA' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('officeCode が不正です');
    expect(storage.uploadUserIcon).not.toHaveBeenCalled();
  });

  it.each(['image/svg+xml', 'text/html', 'application/octet-stream'])(
    '400: 画像として受け付けない形式（%s）は保存しない',
    async type => {
      const icon = new File(['<svg onload="alert(1)"/>'], 'x.png', { type });
      expect((await usersPost(registerForm({ icon }))).status).toBe(400);
      expect(storage.uploadUserIcon).not.toHaveBeenCalled();
    },
  );

  it('400: 圧縮しても上限を超える画像は、超えた容量を伝える', async () => {
    image.compressImageToLimit.mockResolvedValueOnce({
      buffer: Buffer.alloc(MAX + 10),
      contentType: 'image/webp',
      extension: 'webp',
      wasCompressed: true,
      originalBytes: MAX + 1,
    });
    const res = await usersPost(registerForm());
    expect(res.status).toBe(400);
    expect((await res.json()).detail).toContain('上限 200KB');
  });

  it('500: 画像の保存に失敗したら、ユーザーを作らない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    storage.uploadUserIcon.mockRejectedValue(new Error('upload error'));
    const res = await usersPost(registerForm());
    expect(res.status).toBe(500);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('500: DB の保存に失敗したら、詳細を返さない', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    prisma.user.create.mockRejectedValue(new Error('unique constraint'));
    const res = await usersPost(registerForm());
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('unique constraint');
  });
});
