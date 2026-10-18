import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAttendanceUserId, getAuthenticatedUserId, signAttendanceToken } from '@/lib/auth';

const withToken = (token?: string) =>
  new NextRequest('http://localhost/api/test', {
    headers: token ? ({ Authorization: `Bearer ${token}` } as any) : undefined,
  });

describe('lib/auth', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, JWT_SECRET: 'test-secret' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const loginToken = () =>
    jwt.sign({ id: 1, name: 'A', officeId: 1, officeCode: 'OKAYAMA' }, 'test-secret', {
      expiresIn: '7d',
    });

  it('ログイン用トークンはどちらの関数でも受け付ける', () => {
    const req = withToken(loginToken());
    expect(getAuthenticatedUserId(req)).toBe(1);
    expect(getAttendanceUserId(req)).toBe(1);
  });

  it('自動入退室専用トークンは入退室にだけ使える', () => {
    const req = withToken(signAttendanceToken(2));
    expect(getAuthenticatedUserId(req)).toBeNull();
    expect(getAttendanceUserId(req)).toBe(2);
  });

  it('自動入退室専用トークンの有効期限は1年', () => {
    const decoded = jwt.decode(signAttendanceToken(2)) as { iat: number; exp: number };
    expect(decoded.exp - decoded.iat).toBe(365 * 24 * 60 * 60);
  });

  it('ヘッダーがなければ null', () => {
    const req = withToken();
    expect(getAuthenticatedUserId(req)).toBeNull();
    expect(getAttendanceUserId(req)).toBeNull();
  });

  it('不正なトークンは例外', () => {
    const req = withToken(jwt.sign({ id: 1 }, 'other-secret'));
    expect(() => getAuthenticatedUserId(req)).toThrow();
    expect(() => getAttendanceUserId(req)).toThrow();
  });
});
