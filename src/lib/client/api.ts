/**
 * Web 画面から API を呼ぶための共通処理（ブラウザで使う）
 * ログイン用のトークンは localStorage に保存し、API を呼ぶときに付ける。
 */

const TOKEN_KEY = 'token';

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** /api 以下の API を呼ぶ。ログイン中ならトークンを付け、文字列の body は JSON として送る */
export const apiFetch = (path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const token = authToken.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`/api${path}`, { ...init, headers });
};

/** JSON を送る */
export const sendJson = (path: string, method: 'POST' | 'PATCH', body: unknown) =>
  apiFetch(path, { method, body: JSON.stringify(body) });

/** Discord に通知する。名前とオフィスはサーバーがトークンから決める */
export const notify = (status: '入室' | '退室' | 'メモを追加', note?: string) =>
  sendJson('/notify', 'POST', note === undefined ? { status } : { status, note });

/** エラーの応答（{ error, detail }）を読む。JSON でなければ本文をそのまま detail にする */
export const readApiError = async (res: Response): Promise<{ error?: string; detail?: string }> => {
  const text = await res.text();
  try {
    const body = JSON.parse(text);
    return {
      error: typeof body?.error === 'string' ? body.error : undefined,
      detail: typeof body?.detail === 'string' ? body.detail : undefined,
    };
  } catch {
    return { detail: text || undefined };
  }
};
