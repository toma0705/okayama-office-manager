/**
 * ユーザー情報の共通処理（クライアントに返す形への変換など）
 */
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/lib/http';
import { resolveUserIconUrl } from '@/lib/storage';

/** 応答に含めるオフィスの項目 */
export const officeSummarySelect = { id: true, code: true, name: true } as const;

type UserSecrets = {
  password?: unknown;
  resetToken?: unknown;
  resetTokenExpires?: unknown;
};

/** パスワードのハッシュやパスワード再設定トークンなど、クライアントに返してはいけない項目を取り除く */
export const omitUserSecrets = <T extends UserSecrets>(
  user: T,
): Omit<T, 'password' | 'resetToken' | 'resetTokenExpires'> => {
  const {
    password: _password,
    resetToken: _resetToken,
    resetTokenExpires: _expires,
    ...safe
  } = user;
  return safe;
};

/** DB に保存しているアイコンのパスを、表示に使える URL にする */
export const withIconUrl = <T extends { iconFileName: string }>(user: T): T => ({
  ...user,
  iconFileName: resolveUserIconUrl(user.iconFileName) ?? user.iconFileName,
});

/** クライアントに返す形にする（秘密の項目を除き、アイコンを URL にする） */
export const toPublicUser = <T extends UserSecrets & { iconFileName: string }>(user: T) =>
  withIconUrl(omitUserSecrets(user));

/** ID でユーザーを探す。見つからなければ 404 */
export const findUserOrThrow = async (id: number) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new HttpError(404, 'ユーザーが見つかりません');
  return user;
};
