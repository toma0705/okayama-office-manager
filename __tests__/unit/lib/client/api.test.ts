import { apiFetch, authToken, notify, readApiError, sendJson } from '@/lib/client/api';

// テストは Node で動くので、ブラウザの localStorage の代わりを用意する
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
});

const fetchMock = jest.fn().mockResolvedValue(new Response('{}'));
global.fetch = fetchMock;

const lastRequest = () => {
  const [url, init] = fetchMock.mock.calls.at(-1)!;
  return { url, init, headers: new Headers(init.headers) };
};

describe('lib/client/api', () => {
  beforeEach(() => {
    storage.clear();
    fetchMock.mockClear();
  });

  it('トークンを保存・取得・削除できる', () => {
    expect(authToken.get()).toBeNull();
    authToken.set('abc');
    expect(authToken.get()).toBe('abc');
    authToken.clear();
    expect(authToken.get()).toBeNull();
  });

  it('/api 以下を呼び、ログイン中ならトークンを付ける', async () => {
    await apiFetch('/users/me');
    expect(lastRequest().url).toBe('/api/users/me');
    expect(lastRequest().headers.has('Authorization')).toBe(false);

    authToken.set('abc');
    await apiFetch('/users/me');
    expect(lastRequest().headers.get('Authorization')).toBe('Bearer abc');
  });

  it('JSON を送るときは Content-Type を付け、FormData には付けない', async () => {
    await sendJson('/users/login', 'POST', { email: 'a' });
    expect(lastRequest().init.method).toBe('POST');
    expect(lastRequest().init.body).toBe('{"email":"a"}');
    expect(lastRequest().headers.get('Content-Type')).toBe('application/json');

    await apiFetch('/users', { method: 'POST', body: new FormData() });
    expect(lastRequest().headers.has('Content-Type')).toBe(false);
  });

  it('通知はステータス（とメモ）だけを送る', async () => {
    await notify('入室');
    expect(JSON.parse(lastRequest().init.body)).toEqual({ status: '入室' });

    await notify('メモを追加', 'こんにちは');
    expect(JSON.parse(lastRequest().init.body)).toEqual({
      status: 'メモを追加',
      note: 'こんにちは',
    });
  });

  it('エラーの応答から error と detail を読む', async () => {
    await expect(
      readApiError(new Response(JSON.stringify({ error: '重複', detail: '詳細' }))),
    ).resolves.toEqual({ error: '重複', detail: '詳細' });
    await expect(readApiError(new Response('Bad Gateway'))).resolves.toEqual({
      detail: 'Bad Gateway',
    });
    await expect(readApiError(new Response(''))).resolves.toEqual({ detail: undefined });
  });
});
