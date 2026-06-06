import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '@/types/declaration';

export const getAuthenticatedUserId = (req: NextRequest): number | null => {
  const auth = req.headers.get('authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return null;
  }

  const token = auth.replace('Bearer ', '');
  const secret = process.env.JWT_SECRET || 'secret';
  const decoded = jwt.verify(token, secret) as JwtPayload;

  return Number(decoded.id);
};
