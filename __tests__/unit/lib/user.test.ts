jest.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: jest.fn() } } }));
jest.mock('@/lib/storage', () => ({
  resolveUserIconUrl: jest.fn((value: string) => `https://cdn.example.com/${value}`),
}));

import { findUserOrThrow, omitUserSecrets, toPublicUser, withIconUrl } from '@/lib/user';

const prisma = jest.requireMock('@/lib/prisma').prisma as any;

describe('lib/user', () => {
  it('パスワードとパスワード再設定トークンを取り除く', () => {
    const safe = omitUserSecrets({
      id: 1,
      name: 'A',
      password: 'hash',
      resetToken: 'reset',
      resetTokenExpires: new Date(),
    });
    expect(safe).toEqual({ id: 1, name: 'A' });
  });

  it('アイコンの保存パスを表示用の URL にする', () => {
    expect(withIconUrl({ id: 1, iconFileName: 'a.png' })).toEqual({
      id: 1,
      iconFileName: 'https://cdn.example.com/a.png',
    });
  });

  it('クライアントに返す形にする（秘密を除き、アイコンを URL に）', () => {
    expect(toPublicUser({ id: 1, iconFileName: 'a.png', password: 'hash' })).toEqual({
      id: 1,
      iconFileName: 'https://cdn.example.com/a.png',
    });
  });

  it('ユーザーが見つかれば返し、見つからなければ 404', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 1 });
    await expect(findUserOrThrow(1)).resolves.toEqual({ id: 1 });

    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(findUserOrThrow(2)).rejects.toMatchObject({ status: 404 });
  });
});
