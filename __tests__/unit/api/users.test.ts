import { POST as usersPost } from '@/app/api/users/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    office: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/storage', () => ({
  MAX_ICON_SIZE_BYTES: 200 * 1024,
  uploadUserIcon: jest.fn(),
  removeUserIconByUrl: jest.fn(),
}));

jest.mock('@/utils/image', () => ({
  compressImageToLimit: jest.fn(async (buffer: Buffer, { mimeType }: any) => ({
    buffer,
    contentType: mimeType ?? 'image/png',
    extension: mimeType?.split('/')?.pop() ?? 'png',
    wasCompressed: false,
    originalBytes: buffer.length,
  })),
}));

describe('POST /api/users', () => {
  const originalEnv = process.env.NODE_ENV;
  const prisma = require('@/lib/prisma').prisma;
  const storage = require('@/lib/storage');
  const imageUtils = require('@/utils/image');
  const compressMock = imageUtils.compressImageToLimit as jest.Mock;

  const createMockFile = ({
    size = 1,
    type = 'image/png',
    name = 'icon.png',
    fail = false,
  }: {
    size?: number;
    type?: string;
    name?: string;
    fail?: boolean;
  } = {}) => {
    const buildBuffer = () => {
      const bytes = new Uint8Array(size);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    };
    const file = new File([new Uint8Array(size)], name, { type } as any);
    Object.defineProperty(file, 'arrayBuffer', {
      value: fail
        ? jest.fn().mockRejectedValue(new Error('fail'))
        : jest.fn().mockImplementation(() => Promise.resolve(buildBuffer())),
      configurable: true,
    });
    return file as any;
  };

  beforeEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
    storage.uploadUserIcon.mockReset();
    prisma.user.findUnique.mockReset();
    prisma.user.create.mockReset();
    prisma.office.findUnique.mockReset();
    compressMock.mockReset();
    compressMock.mockImplementation(async (buffer: Buffer, { mimeType }: any) => ({
      buffer,
      contentType: mimeType ?? 'image/png',
      extension: mimeType?.split('/')?.pop() ?? 'png',
      wasCompressed: false,
      originalBytes: buffer.length,
    }));
    storage.uploadUserIcon.mockResolvedValue({
      publicUrl:
        'https://example.supabase.co/storage/v1/object/public/office-manager-icon/user-icons/default.png',
      storagePath: 'user-icons/default.png',
    });
  });

  afterEach(() => {
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    jest.clearAllMocks();
  });

  it('409: メール重複時', async () => {
    const form = new FormData();
    const icon = createMockFile();
    form.set('name', 'a');
    form.set('email', 'dup@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    form.set('officeCode', 'OKAYAMA');
    prisma.user.findUnique = jest.fn().mockResolvedValue({});
    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(409);
  });

  it('500: ファイル読み込み失敗時', async () => {
    const form = new FormData();
    const icon = createMockFile({ fail: true });
    form.set('name', 'a');
    form.set('email', 'b@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    form.set('officeCode', 'TOKYO');
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    prisma.office.findUnique = jest.fn().mockResolvedValue({
      id: 2,
      code: 'TOKYO',
      name: '東京オフィス',
    });
    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(500);
  });

  it('500: Supabaseアップロード失敗時', async () => {
    const form = new FormData();
    const icon = createMockFile();
    form.set('name', 'a');
    form.set('email', 'b@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    form.set('officeCode', 'TOKYO');
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    prisma.office.findUnique = jest.fn().mockResolvedValue({
      id: 2,
      code: 'TOKYO',
      name: '東京オフィス',
    });
    storage.uploadUserIcon.mockRejectedValue(new Error('upload error'));
    prisma.user.create = jest.fn();
    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(500);
  });

  it('400: 圧縮後も200KBを超える場合', async () => {
    const form = new FormData();
    const icon = createMockFile({
      size: storage.MAX_ICON_SIZE_BYTES + 1,
      name: 'big.png',
    });
    form.set('name', 'a');
    form.set('email', 'b@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    form.set('officeCode', 'TOKYO');
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    prisma.office.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 2, code: 'TOKYO', name: '東京オフィス' });

    compressMock.mockResolvedValueOnce({
      buffer: Buffer.alloc(storage.MAX_ICON_SIZE_BYTES + 10),
      contentType: 'image/webp',
      extension: 'webp',
      wasCompressed: true,
      originalBytes: storage.MAX_ICON_SIZE_BYTES + 1,
    });

    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(400);
  });

  it('201: 大きな画像でも圧縮してアップロード', async () => {
    const form = new FormData();
    const icon = createMockFile({
      size: storage.MAX_ICON_SIZE_BYTES + 5000,
      name: 'huge.png',
    });
    form.set('name', 'a');
    form.set('email', 'c@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    form.set('officeCode', 'TOKYO');
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    prisma.office.findUnique = jest
      .fn()
      .mockResolvedValue({ id: 2, code: 'TOKYO', name: '東京オフィス' });
    prisma.user.create = jest.fn().mockResolvedValue({
      id: 1,
      name: 'a',
      email: 'c@example.com',
      officeId: 2,
      iconFileName: 'https://example/icon.webp',
      office: { id: 2, code: 'TOKYO', name: '東京オフィス' },
    });

    compressMock.mockResolvedValueOnce({
      buffer: Buffer.alloc(storage.MAX_ICON_SIZE_BYTES - 10),
      contentType: 'image/webp',
      extension: 'webp',
      wasCompressed: true,
      originalBytes: storage.MAX_ICON_SIZE_BYTES + 5000,
    });

    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(201);
    expect(storage.uploadUserIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        contentType: 'image/webp',
        buffer: expect.any(Buffer),
        fileName: expect.stringMatching(/\.webp$/),
      }),
    );
  });

  it('500: prisma.user.create失敗時', async () => {
    const form = new FormData();
    const icon = createMockFile();
    form.set('name', 'a');
    form.set('email', 'b@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    form.set('officeCode', 'TOKYO');
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    prisma.office.findUnique = jest.fn().mockResolvedValue({
      id: 2,
      code: 'TOKYO',
      name: '東京オフィス',
    });
    storage.uploadUserIcon.mockResolvedValue({
      publicUrl:
        'https://example.supabase.co/storage/v1/object/public/office-manager-icon/user-icons/icon.png',
      storagePath: 'user-icons/icon.png',
    });
    prisma.user.create = jest.fn().mockRejectedValue(new Error('fail'));
    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(500);
  });

  it('400: 必須項目不足', async () => {
    const form = new FormData();
    const req = { formData: async () => form } as any;
    const res = await usersPost(req as NextRequest);
    expect(res.status).toBe(400);
  });

  // 画像アップロードやSupabase Storageへの保存の正常系・異常系は、
  // 実際のSupabase通信をモックしてテストする必要があるため、
  // ここでは省略または別途モック実装が必要です。
});
