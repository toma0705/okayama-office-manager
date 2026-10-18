import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@/types/declaration';

/**
 * JWT の署名鍵。未設定のまま固定の値で署名すると誰でもトークンを偽造できるため、
 * 未設定ならエラーにする（ログインや認証が必要な API は失敗する）
 */
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET が設定されていません');
  }
  return secret;
};

export const getAuthenticatedUserId = (req: NextRequest): number | null => {
  const auth = req.headers.get('authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.replace('Bearer ', '');
  const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

  return Number(decoded.id);
};
