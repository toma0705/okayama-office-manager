import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/** DB を空にし、岡山オフィスとユーザーを 1 人作る */
export const resetDatabase = async () => {
  await prisma.$executeRawUnsafe('TRUNCATE "User", "Office" RESTART IDENTITY CASCADE');
  const office = await prisma.office.create({ data: { code: 'OKAYAMA', name: '岡山オフィス' } });
  const user = await createUser('テスト', office.id);
  return { office, user };
};

export const createUser = (name: string, officeId: number) =>
  prisma.user.create({
    data: {
      name,
      email: `${name}-${Date.now()}-${Math.random()}@4nonome.com`,
      password: 'hash',
      iconFileName: 'icon.png',
      officeId,
    },
  });

export const reloadUser = (id: number) => prisma.user.findUniqueOrThrow({ where: { id } });

/** Discord に送ったメッセージ（fetch のモックから取り出す） */
export const sentMessages = (fetchMock: jest.Mock) =>
  fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));

/** ログイン済みのリクエストを作る（本物の JWT を使う） */
export const authedRequest = (userId: number, path: string, method = 'GET') =>
  new NextRequest(`http://localhost/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${jwt.sign({ id: userId }, process.env.JWT_SECRET!)}` },
  });

export const idContext = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

export const after = (base: Date, { minutes = 0, seconds = 0 }) =>
  new Date(base.getTime() + (minutes * 60 + seconds) * 1000);
