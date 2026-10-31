/**
 * 入退室の保留と確定の流れを、本物の Postgres で通して確かめる。
 * （単体テストでは Prisma をモックしているので、クエリそのものはここで確かめる）
 */
import type { User } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  arrive,
  checkoutAllEntered,
  enterNow,
  leave,
  settlePendingAttendance,
} from '@/lib/attendance';
import { after, createUser, reloadUser, resetDatabase, sentMessages } from './helpers';

const fetchMock = jest.fn();
global.fetch = fetchMock;

const t0 = new Date('2026-11-01T01:00:00Z');
let user: User;
let officeId: number;

beforeEach(async () => {
  fetchMock.mockReset().mockResolvedValue({ ok: true });
  const created = await resetDatabase();
  user = created.user;
  officeId = created.office.id;
});

afterAll(() => prisma.$disconnect());

describe('入室（確認の時間は 1 分）', () => {
  it('圏内に 1 分いれば、最初に検知した時刻で入室になり、在室状況つきで 1 通届く', async () => {
    await arrive(await reloadUser(user.id), t0);
    // 圏内のまま、もう一度知らせが来ても最初の時刻を保つ
    await arrive(await reloadUser(user.id), after(t0, { seconds: 30 }));

    await expect(settlePendingAttendance(after(t0, { seconds: 59 }))).resolves.toEqual({
      entered: 0,
      exited: 0,
    });
    await expect(settlePendingAttendance(after(t0, { minutes: 1 }))).resolves.toEqual({
      entered: 1,
      exited: 0,
    });

    const confirmed = await reloadUser(user.id);
    expect(confirmed).toMatchObject({ entered: true, enteredAt: t0, enterPendingSince: null });

    const messages = sentMessages(fetchMock);
    expect(messages).toHaveLength(1);
    expect(messages[0].content).toBe('テスト さんが 入室 しました！');
    expect(messages[0].embeds[0].title).toBe('📍 岡山オフィスの在室状況（1人）');
  });

  it('1 分以内に圏外になれば（前を通っただけ）、入室にならず何も届かない', async () => {
    await arrive(await reloadUser(user.id), t0);
    await leave(await reloadUser(user.id), after(t0, { seconds: 20 }));

    await settlePendingAttendance(after(t0, { minutes: 5 }));

    expect(await reloadUser(user.id)).toMatchObject({ entered: false, enterPendingSince: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('同時に確定しても（定期実行と /users/me が重なっても）、届くのは 1 通だけ', async () => {
    await arrive(await reloadUser(user.id), t0);

    const results = await Promise.all([
      settlePendingAttendance(after(t0, { minutes: 2 })),
      settlePendingAttendance(after(t0, { minutes: 2 })),
    ]);

    expect(results.reduce((sum, r) => sum + r.entered, 0)).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('退室（猶予は 15 分）', () => {
  beforeEach(async () => {
    await enterNow(await reloadUser(user.id), t0);
    await prisma.user.update({ where: { id: user.id }, data: { note: '作業中' } });
  });

  it('猶予の間に戻れば、入室の時刻を保ったまま入室中に戻り、何も届かない', async () => {
    const leftAt = after(t0, { minutes: 60 });
    await leave(await reloadUser(user.id), leftAt);
    await arrive(await reloadUser(user.id), after(leftAt, { minutes: 10 }));

    await settlePendingAttendance(after(leftAt, { minutes: 60 }));

    expect(await reloadUser(user.id)).toMatchObject({
      entered: true,
      enteredAt: t0,
      exitPendingSince: null,
      note: '作業中',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('猶予を過ぎれば、圏外になった時刻で退室になり、メモも消える', async () => {
    const leftAt = after(t0, { minutes: 60 });
    await leave(await reloadUser(user.id), leftAt);
    // 圏外のまま、もう一度知らせが来ても最初の時刻を保つ
    await leave(await reloadUser(user.id), after(leftAt, { minutes: 5 }));

    await expect(settlePendingAttendance(after(leftAt, { minutes: 14 }))).resolves.toEqual({
      entered: 0,
      exited: 0,
    });
    await expect(settlePendingAttendance(after(leftAt, { minutes: 15 }))).resolves.toEqual({
      entered: 0,
      exited: 1,
    });

    expect(await reloadUser(user.id)).toMatchObject({
      entered: false,
      exitedAt: leftAt,
      exitPendingSince: null,
      note: null,
    });
    const messages = sentMessages(fetchMock);
    expect(messages.map(m => m.content)).toEqual(['テスト さんが 退室 しました！']);
    expect(messages[0].embeds[0].title).toBe('📍 岡山オフィスの在室状況（0人）');
  });
});

describe('毎日 4:00 の一括退室', () => {
  it('入室中と退室の保留中の人を退室にし、Discord には何も送らない', async () => {
    const inOffice = await createUser('在室', officeId);
    const leaving = await createUser('猶予中', officeId);
    await enterNow(inOffice, t0);
    await enterNow(leaving, t0);
    await leave(await reloadUser(leaving.id), after(t0, { minutes: 30 }));

    const checkoutAt = after(t0, { minutes: 600 });
    await expect(checkoutAllEntered(checkoutAt)).resolves.toBe(2);

    for (const id of [inOffice.id, leaving.id]) {
      expect(await reloadUser(id)).toMatchObject({
        entered: false,
        exitedAt: checkoutAt,
        exitPendingSince: null,
      });
    }
    expect(await reloadUser(user.id)).toMatchObject({ entered: false, exitedAt: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
