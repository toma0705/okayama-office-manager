/**
 * ログインの仕組み（JWT）
 *
 * 1. ログインに成功すると、サーバーは「このユーザーは id=3 です」という情報に
 *    秘密の鍵（JWT_SECRET）で署名した文字列＝トークン（JWT）を返す（/api/users/login）
 * 2. 画面やアプリは、そのトークンを保存しておき、API を呼ぶたびに
 *    `Authorization: Bearer <トークン>` というヘッダーに付けて送る
 * 3. サーバーは署名を確かめて、だれからのリクエストかを知る（getAuthenticatedUserId）
 *
 * 署名は秘密の鍵を知っている人にしか作れないので、トークンを書き換えて他人になりすますことはできない。
 */
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

/** ログイン時に発行する JWT の中身（/api/users/login） */
export type JwtPayload = {
  id: number;
  name: string;
  iconFileName: string;
  officeId: number;
  officeCode: string;
  /** 発行した時刻（JWT のライブラリが自動で入れる） */
  iat?: number;
  /** 期限が切れる時刻（JWT のライブラリが自動で入れる） */
  exp?: number;
};

/**
 * JWT に署名するための秘密の鍵を、環境変数 JWT_SECRET から読む。
 * 未設定のまま適当な値で署名すると、だれでもトークンを偽造できてしまうので、
 * 未設定ならエラーにする（ログインや認証が必要な API は失敗する）。
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET が設定されていません');
  }
  return secret;
};

/**
 * リクエストの Authorization ヘッダーからトークンを取り出して、ログイン中のユーザーの ID を返す。
 * - ヘッダーがない → null
 * - トークンが不正・期限切れ → jwt.verify がエラーを投げる
 * API ルートでは、これを直接使わずに src/lib/http.ts の requireAuth を使う（エラーを 401 にしてくれる）。
 */
export const getAuthenticatedUserId = (req: NextRequest): number | null => {
  const auth = req.headers.get('authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.replace('Bearer ', '');
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

  return Number(decoded.id);
};
