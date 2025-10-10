import { POST as usersPost } from '@/app/api/users/route';
import { NextRequest } from 'next/server';

describe('POST /api/users', () => {
  it('409: メール重複時', async () => {
    class MockFile extends Blob {
      name: string;
      constructor() {
        super([''], { type: 'image/png' });
        this.name = 'icon.png';
      }
      async arrayBuffer() {
        return new ArrayBuffer(1);
      }
    }
    global.File = MockFile as any;
    globalThis.File = MockFile as any;
    globalThis.Blob = MockFile as any;
    const form = new FormData();
    const icon = new MockFile();
    Object.setPrototypeOf(icon, MockFile.prototype);
    Object.setPrototypeOf(icon, globalThis.File.prototype);
    Object.setPrototypeOf(icon, globalThis.Blob.prototype);
    form.set('name', 'a');
    form.set('email', 'dup@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    const prisma = require('@/lib/prisma').prisma;
    prisma.user.findUnique = jest.fn().mockResolvedValue({});
    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(409);
  });

  it('500: S3/ファイル書き込み失敗時', async () => {
    class MockFile extends Blob {
      name: string;
      constructor() {
        super([''], { type: 'image/png' });
        this.name = 'icon.png';
      }
      arrayBuffer(): Promise<ArrayBuffer> {
        return Promise.reject(new Error('fail'));
      }
    }
    global.File = MockFile as any;
    globalThis.File = MockFile as any;
    globalThis.Blob = MockFile as any;
    const form = new FormData();
    const icon = new MockFile();
    Object.setPrototypeOf(icon, MockFile.prototype);
    Object.setPrototypeOf(icon, globalThis.File.prototype);
    Object.setPrototypeOf(icon, globalThis.Blob.prototype);
    form.set('name', 'a');
    form.set('email', 'b@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    const prisma = require('@/lib/prisma').prisma;
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
    const req = { formData: async () => form } as any;
    const res = await usersPost(req);
    expect(res.status).toBe(500);
  });

  it('500: prisma.user.create失敗時', async () => {
    class MockFile extends Blob {
      name: string;
      constructor() {
        super([''], { type: 'image/png' });
        this.name = 'icon.png';
      }
      async arrayBuffer() {
        return new ArrayBuffer(1);
      }
    }
    global.File = MockFile as any;
    globalThis.File = MockFile as any;
    globalThis.Blob = MockFile as any;
    const form = new FormData();
    const icon = new MockFile();
    Object.setPrototypeOf(icon, MockFile.prototype);
    Object.setPrototypeOf(icon, globalThis.File.prototype);
    Object.setPrototypeOf(icon, globalThis.Blob.prototype);
    form.set('name', 'a');
    form.set('email', 'b@example.com');
    form.set('password', 'pw');
    form.set('icon', icon, icon.name);
    const prisma = require('@/lib/prisma').prisma;
    prisma.user.findUnique = jest.fn().mockResolvedValue(null);
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

  // 画像アップロードやS3への保存の正常系・異常系は、
  // 実際のS3通信をモックしてテストする必要があるため、
  // ここでは省略または別途モック実装が必要です。
});
