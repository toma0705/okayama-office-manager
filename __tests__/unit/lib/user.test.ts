import { omitUserSecrets } from '@/lib/user';

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
});
