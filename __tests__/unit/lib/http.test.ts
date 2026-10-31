jest.mock('@/lib/auth', () => ({ getAuthenticatedUserId: jest.fn() }));

import { NextRequest } from 'next/server';
import {
  handleRoute,
  HttpError,
  parseIdParam,
  readJson,
  requireAuth,
  requireCronSecret,
  requireSelf,
  stringField,
} from '@/lib/http';

const auth = jest.requireMock('@/lib/auth') as { getAuthenticatedUserId: jest.Mock };
const request = (init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest('http://localhost/api/test', init);
const idContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe('handleRoute', () => {
  it('本体の応答をそのまま返す', async () => {
    const route = handleRoute('失敗', async () => Response.json({ ok: true }));
    const res = await route();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('HttpError はそのステータスとメッセージ（と補足）で返す', async () => {
    const route = handleRoute('失敗', async () => {
      throw new HttpError(409, '重複しています', 'メールアドレスが同じです');
    });
    const res = await route();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: '重複しています',
      detail: 'メールアドレスが同じです',
    });
  });

  it('想定外のエラーは 500 で、内部の詳細を返さない', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const route = handleRoute('保存に失敗しました', async () => {
      throw new Error('connection refused: db.internal:5432');
    });
    const res = await route();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: '保存に失敗しました' });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('parseIdParam', () => {
  it('数値の ID を返す', async () => {
    await expect(parseIdParam(idContext('12'))).resolves.toBe(12);
  });

  it.each(['abc', '1.5', '', '0', '-1'])('「%s」は 400', async id => {
    await expect(parseIdParam(idContext(id))).rejects.toMatchObject({ status: 400 });
  });
});

describe('requireAuth / requireSelf', () => {
  beforeEach(() => auth.getAuthenticatedUserId.mockReset());

  it('トークンのユーザーの ID を返す', () => {
    auth.getAuthenticatedUserId.mockReturnValue(3);
    expect(requireAuth(request())).toBe(3);
  });

  it('トークンがなければ 401', () => {
    auth.getAuthenticatedUserId.mockReturnValue(null);
    expect(() => requireAuth(request())).toThrow(expect.objectContaining({ status: 401 }));
  });

  it('トークンが不正・期限切れ（検証でエラー）でも 401（500 にしない）', () => {
    auth.getAuthenticatedUserId.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    expect(() => requireAuth(request())).toThrow(expect.objectContaining({ status: 401 }));
  });

  it('本人なら通し、他人なら 403', () => {
    auth.getAuthenticatedUserId.mockReturnValue(3);
    expect(() => requireSelf(request(), 3)).not.toThrow();
    expect(() => requireSelf(request(), 4)).toThrow(expect.objectContaining({ status: 403 }));
  });
});

describe('requireCronSecret', () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    process.env.CRON_SECRET = original;
  });

  it('正しい秘密の値なら通す', () => {
    process.env.CRON_SECRET = 'secret';
    const req = request({ headers: { Authorization: 'Bearer secret' } });
    expect(() => requireCronSecret(req)).not.toThrow();
  });

  it('値が違えば 401', () => {
    process.env.CRON_SECRET = 'secret';
    const req = request({ headers: { Authorization: 'Bearer wrong' } });
    expect(() => requireCronSecret(req)).toThrow(expect.objectContaining({ status: 401 }));
  });

  it('CRON_SECRET が未設定なら、どんなヘッダーでも通さない', () => {
    delete process.env.CRON_SECRET;
    const req = request({ headers: { Authorization: 'Bearer undefined' } });
    expect(() => requireCronSecret(req)).toThrow(expect.objectContaining({ status: 401 }));
  });
});

describe('readJson / stringField', () => {
  const post = (body: string) => request({ method: 'POST', body });

  it('JSON のオブジェクトを返す', async () => {
    await expect(readJson(post('{"note":"a"}'))).resolves.toEqual({ note: 'a' });
  });

  it.each(['{壊れた', '[1,2]', '"text"'])('オブジェクトでない JSON（%s）は 400', async body => {
    await expect(readJson(post(body))).rejects.toMatchObject({ status: 400 });
  });

  it('文字列の値だけを取り出す', () => {
    expect(stringField({ a: 'x', b: 1 }, 'a')).toBe('x');
    expect(stringField({ a: 'x', b: 1 }, 'b')).toBeUndefined();
    expect(stringField({}, 'c')).toBeUndefined();
  });
});
