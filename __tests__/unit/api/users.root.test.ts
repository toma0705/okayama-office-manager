import { GET as usersGet, POST as usersPost } from '@/app/api/users/route';

// prisma モック
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// bcrypt モック
jest.mock('bcryptjs', () => ({ hash: jest.fn(async () => 'hashed_pw') }));

// S3 SDK モック（トップレベル初期化の副作用を無効化）
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
}));

// fs/promises モック（開発環境パスで利用）
jest.mock('fs/promises', () => ({
  access: jest.fn().mockRejectedValue(new Error('no dir')),
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// S3クライアントは本テストでは使用しない（NODE_ENV=developmentにしてローカル保存パスへ）

const prisma = jest.requireMock('@/lib/prisma').prisma as any;

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
  });

  afterAll(() => {
    (process.env as any).NODE_ENV = origEnv;
  });

  it('GET: 200 ユーザー一覧取得', async () => {
    const list = [
      { id: 1, name: 'A', iconFileName: '/uploads/a.png' },
      { id: 2, name: 'B', iconFileName: '/uploads/b.png' },
    ];
    prisma.user.findMany.mockResolvedValue(list);

    const res = await usersGet();
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

    prisma.user.findUnique.mockResolvedValue({ id: 1 });

    const req = { formData: async () => fd } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(409);
  });

  it('POST: 201 成功（開発環境・ローカル保存）', async () => {
    const fd = new FormData();
    fd.append('name', 'Hanako');
    fd.append('email', 'hanako@example.com');
    fd.append('password', 'pw');
    const file = new File([Uint8Array.from([9, 9, 9])], 'icon.jpg', { type: 'image/jpeg' } as any);
    fd.append('icon', file as any);

    prisma.user.findUnique.mockResolvedValue(null);
    const created = {
      id: 10,
      name: 'Hanako',
      email: 'hanako@example.com',
      iconFileName: '/uploads/x.png',
    };
    prisma.user.create.mockResolvedValue(created);

    const req = { formData: async () => fd } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual(created);
  });
});
