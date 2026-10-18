import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAuthenticatedUserId, getJwtSecret } from '@/lib/auth';

const withToken = (token: string) =>
  new NextRequest('http://localhost/api/test', {
    headers: { Authorization: `Bearer ${token}` } as any,
  });

describe('lib/auth', () => {
  const OLD_SECRET = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = OLD_SECRET;
  });

  it('JWT_SECRET が未設定ならエラー（固定の値で代用しない）', () => {
    delete process.env.JWT_SECRET;
    expect(() => getJwtSecret()).toThrow('JWT_SECRET');
    expect(() => getAuthenticatedUserId(withToken(jwt.sign({ id: 1 }, 'secret')))).toThrow();
  });

  it('設定された鍵で署名したトークンだけを受け付ける', () => {
    process.env.JWT_SECRET = 'test-secret';
    expect(getAuthenticatedUserId(withToken(jwt.sign({ id: 1 }, 'test-secret')))).toBe(1);
    // 以前の既定値 'secret' で偽造したトークンは通らない
    expect(() => getAuthenticatedUserId(withToken(jwt.sign({ id: 1 }, 'secret')))).toThrow();
  });
});
