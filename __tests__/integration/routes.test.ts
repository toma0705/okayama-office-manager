/**
 * アプリが呼ぶ API を、本物の DB と本物の JWT で通して確かめる。
 */
import type { User } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { POST as arrivePOST } from '@/app/api/users/[id]/arrive/route';
import { POST as leavePOST } from '@/app/api/users/[id]/leave/route';
import { GET as meGET } from '@/app/api/users/me/route';
import { authedRequest, idContext, reloadUser, resetDatabase } from './helpers';

global.fetch = jest.fn().mockResolvedValue({ ok: true });

let user: User;

beforeEach(async () => {
  ({ user } = await resetDatabase());
});

afterAll(() => prisma.$disconnect());

const callArrive = () =>
  arrivePOST(authedRequest(user.id, `/users/${user.id}/arrive`, 'POST'), idContext(user.id));
const callLeave = () =>
  leavePOST(authedRequest(user.id, `/users/${user.id}/leave`, 'POST'), idContext(user.id));
const callMe = async () => (await meGET(authedRequest(user.id, '/users/me'))).json();

it('圏内 → 1 分後に /users/me を開くと入室中になっている', async () => {
  await expect((await callArrive()).json()).resolves.toEqual({ status: 'pending' });

  // 保留中は、まだ入室中の一覧に出ない（アプリは enterPendingSince を見て保留中だと分かる）
  const pending = await callMe();
  expect(pending.user).toMatchObject({ entered: false, enterPendingSince: expect.any(String) });
  expect(pending.enteredUsers).toEqual([]);

  // 1 分経ったことにする
  await prisma.user.update({
    where: { id: user.id },
    data: { enterPendingSince: new Date(Date.now() - 61 * 1000) },
  });

  const confirmed = await callMe();
  expect(confirmed.user).toMatchObject({ entered: true, enterPendingSince: null });
  expect(confirmed.enteredUsers.map((u: { id: number }) => u.id)).toEqual([user.id]);
  // 秘密の項目は返さない
  expect(confirmed.user).not.toHaveProperty('password');
  expect(confirmed.user).not.toHaveProperty('resetToken');
});

it('圏内 → すぐ圏外なら、保留が取り消される', async () => {
  await callArrive();
  await expect((await callLeave()).json()).resolves.toEqual({ status: 'exited' });

  expect(await reloadUser(user.id)).toMatchObject({ entered: false, enterPendingSince: null });
});
