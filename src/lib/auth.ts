import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import type { AttendanceJwtPayload, JwtPayload } from '@/types/declaration';

// 自動入退室専用トークンの有効期限。アプリはほとんど開かれないため、ログイン用(7日)より長くする
export const ATTENDANCE_TOKEN_EXPIRES_IN = '365d';

const getSecret = () => process.env.JWT_SECRET || 'secret';

/** Authorization ヘッダーのトークンを検証する。ヘッダーがなければ null、不正なら例外 */
const verifyBearer = (req: NextRequest): JwtPayload | AttendanceJwtPayload | null => {
  const auth = req.headers.get('authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.replace('Bearer ', '');
  return jwt.verify(token, getSecret()) as JwtPayload | AttendanceJwtPayload;
};

/** ログイン用トークンのユーザー ID。自動入退室専用トークンは受け付けない */
export const getAuthenticatedUserId = (req: NextRequest): number | null => {
  const decoded = verifyBearer(req);
  if (!decoded || 'scope' in decoded) {
    return null;
  }

  return Number(decoded.id);
};

/** 入退室の操作に使えるユーザー ID。ログイン用・自動入退室専用のどちらのトークンも受け付ける */
export const getAttendanceUserId = (req: NextRequest): number | null => {
  const decoded = verifyBearer(req);
  return decoded ? Number(decoded.id) : null;
};

/** 自動入退室専用トークンを発行する。入室・退室・在室状態の確認にしか使えない */
export const signAttendanceToken = (userId: number): string =>
  jwt.sign({ id: userId, scope: 'attendance' } satisfies Omit<AttendanceJwtPayload, 'iat' | 'exp'>, getSecret(), {
    expiresIn: ATTENDANCE_TOKEN_EXPIRES_IN,
  });
