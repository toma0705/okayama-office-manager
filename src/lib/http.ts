/**
 * API ルートの共通処理
 *
 * どのルートも「入力の確認 → 認証 → 本処理」の順に書く。途中で失敗したら HttpError を投げ、
 * handleRoute がそのステータスのレスポンス（{ error: メッセージ }）に変える。
 *
 *   export const POST = handleRoute('入室に失敗しました', async (req, context: IdContext) => {
 *     const userId = await parseIdParam(context); // 数値でなければ 400
 *     requireSelf(req, userId);                   // トークンがなければ 401、他人なら 403
 *     ...
 *   });
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';

/** 決まったステータスで失敗させたいときに投げる。detail は利用者に見せてよい補足 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
  }
}

export const jsonError = (status: number, message: string, detail?: string) =>
  NextResponse.json(detail ? { error: message, detail } : { error: message }, { status });

/**
 * ルートの本体を包む。HttpError はそのステータスで、想定外のエラーはログに残して 500 で返す。
 * 500 の応答には内部の情報（エラーの詳細）を含めない。
 */
export const handleRoute =
  <Args extends unknown[]>(failureMessage: string, handler: (...args: Args) => Promise<Response>) =>
  async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof HttpError) return jsonError(error.status, error.message, error.detail);
      console.error(failureMessage, error);
      return jsonError(500, failureMessage);
    }
  };

/** /api/users/[id]/... の 2 つ目の引数 */
export type IdContext = { params: Promise<{ id: string }> };

/** URL の [id] を数値にする。正の整数でなければ 400 */
export const parseIdParam = async (context: IdContext): Promise<number> => {
  const { id } = await context.params;
  if (!/^[1-9]\d*$/.test(id)) throw new HttpError(400, '不正なIDです');
  return Number(id);
};

/** ログイン中のユーザーの ID を返す。トークンがない・不正・期限切れなら 401 */
export const requireAuth = (req: NextRequest): number => {
  let userId: number | null = null;
  try {
    userId = getAuthenticatedUserId(req);
  } catch {
    userId = null;
  }
  if (!userId) throw new HttpError(401, '認証情報がありません');
  return userId;
};

/** 本人のトークンでなければ失敗させる（401 / 403） */
export const requireSelf = (req: NextRequest, userId: number) => {
  if (requireAuth(req) !== userId) throw new HttpError(403, '他のユーザーは操作できません');
};

/** 定期実行（cron-job.org）からの呼び出しか確かめる。Authorization: Bearer <CRON_SECRET> */
export const requireCronSecret = (req: NextRequest) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    throw new HttpError(401, 'Unauthorized');
  }
};

/** リクエストの JSON を読む。JSON でなければ 400 */
export const readJson = async (req: NextRequest): Promise<Record<string, unknown>> => {
  try {
    const body = await req.json();
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {
    // 下で 400 にする
  }
  throw new HttpError(400, 'リクエストの形式が正しくありません');
};

/** JSON の値を文字列として取り出す（文字列でなければ undefined） */
export const stringField = (body: Record<string, unknown>, key: string) => {
  const value = body[key];
  return typeof value === 'string' ? value : undefined;
};
