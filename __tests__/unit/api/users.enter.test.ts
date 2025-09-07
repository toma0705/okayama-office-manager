import { NextRequest } from 'next/server';
import { POST as enter } from '@/app/api/users/[id]/enter/route';

jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      user: {
        update: jest.fn().mockResolvedValue({ id: 1, entered: true }),
      },
    },
  };
});

describe('POST /api/users/[id]/enter', () => {
  it('正常系: 入室に成功', async () => {
    const req = new NextRequest('http://localhost/api/users/1/enter', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: '1' }) };

    const res = await enter(req, context);
    const json: any = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('入室しました');
  });

  it('不正ID: 400', async () => {
    const req = new NextRequest('http://localhost/api/users/xxx/enter', { method: 'POST' });
    const context: any = { params: Promise.resolve({ id: 'xxx' }) };

    const res = await enter(req, context);
    const json: any = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('不正なID');
  });
});
