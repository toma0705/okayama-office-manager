import { GET as usersGet, POST as usersPost } from '@/app/api/users/route';

// prisma モック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    office: {
      findUnique: jest.fn(),
    },
  },
}));

// bcrypt モック
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'hashed_pw') }));

jest.mock('@/lib/storage', () => ({
  MAX_ICON_SIZE_BYTES: 200 * 1024,
  uploadUserIcon: jest.fn(),
  removeUserIconByUrl: jest.fn(),
}));

const prisma = jest.requireMock('@/lib/prisma').prisma as any;
const storage = jest.requireMock('@/lib/storage');

describe('GET/POST /api/users (root)', () => {
  const origEnv = (process.env as any).NODE_ENV;

  beforeAll(() => {
    // Node環境で File が未定義なら軽量ポリフィル
    if (typeof (global as any).File === 'undefined') {
      class PolyfillFile extends Blob {
        name: string;
        lastModified: number;
        constructor(bits: any[], name: string, options: any = {}) {
          super(bits, options);
          this.name = name;
          this.lastModified = options.lastModified || Date.now();
        }
        get type() {
          return (this as any)[Symbol.toStringTag] ? (this as any).type : '';
        }
      }
      (global as any).File = PolyfillFile as any;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (process.env as any).NODE_ENV = 'development';
    storage.uploadUserIcon.mockReset();
    storage.uploadUserIcon.mockResolvedValue({
      publicUrl:
        'https://example.supabase.co/storage/v1/object/public/office-manager-icon/user-icons/default.png',
      storagePath: 'user-icons/default.png',
    });
  });

  afterAll(() => {
    (process.env as any).NODE_ENV = origEnv;
  });

  it('GET: 200 ユーザー一覧取得', async () => {
    const list = [
      {
        id: 1,
        name: 'A',
        iconFileName: '/uploads/a.png',
        officeId: 1,
        office: { id: 1, code: 'OKAYAMA', name: '岡山オフィス' },
      },
      {
        id: 2,
        name: 'B',
        iconFileName: '/uploads/b.png',
        officeId: 2,
        office: { id: 2, code: 'TOKYO', name: '東京オフィス' },
      },
    ];
    prisma.user.findMany.mockResolvedValue(list);

    const res = await usersGet({ nextUrl: { searchParams: new URLSearchParams() } } as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual(list);
  });

  it('POST: 400 必須フィールド不足', async () => {
    const req = { formData: async () => new FormData() } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(400);
  });

  it('POST: 409 メール重複', async () => {
    const fd = new FormData();
    fd.append('name', 'Taro');
    fd.append('email', 'taro@example.com');
    fd.append('password', 'pw');
    const file = new File([Uint8Array.from([1, 2, 3])], 'avatar.png', { type: 'image/png' } as any);
    fd.append('icon', file as any);
    fd.append('officeCode', 'OKAYAMA');

    prisma.user.findUnique.mockResolvedValue({ id: 1 });

    const req = { formData: async () => fd } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(409);
  });

  it('POST: 201 成功（Supabaseアップロード）', async () => {
    const fd = new FormData();
    fd.append('name', 'Hanako');
    fd.append('email', 'hanako@example.com');
    fd.append('password', 'pw');
    const file = new File([Uint8Array.from([9, 9, 9])], 'icon.jpg', { type: 'image/jpeg' } as any);
    fd.append('icon', file as any);
    fd.append('officeCode', 'TOKYO');

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.office.findUnique.mockResolvedValue({ id: 2, code: 'TOKYO', name: '東京オフィス' });
    const created = {
      id: 10,
      name: 'Hanako',
      email: 'hanako@example.com',
      iconFileName: '/uploads/x.png',
      officeId: 2,
      office: { id: 2, code: 'TOKYO', name: '東京オフィス' },
    };
    prisma.user.create.mockImplementation(async ({ data }: any) => ({
      ...created,
      iconFileName: data.iconFileName,
    }));
    storage.uploadUserIcon.mockResolvedValue({
      publicUrl:
        'https://example.supabase.co/storage/v1/object/public/office-manager-icon/user-icons/icon.jpg',
      storagePath: 'user-icons/icon.jpg',
    });

    const req = { formData: async () => fd } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      ...created,
      iconFileName:
        'https://example.supabase.co/storage/v1/object/public/office-manager-icon/user-icons/icon.jpg',
    });
  });

  it('POST: 400 存在しないオフィスコード', async () => {
    const fd = new FormData();
    fd.append('name', 'Mika');
    fd.append('email', 'mika@example.com');
    fd.append('password', 'pw');
    const file = new File([Uint8Array.from([7, 7, 7])], 'icon.jpg', { type: 'image/jpeg' } as any);
    fd.append('icon', file as any);
    fd.append('officeCode', 'OSAKA');

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.office.findUnique.mockResolvedValue(null);

    const req = { formData: async () => fd } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(400);
  });
});
