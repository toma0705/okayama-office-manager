type UserSecrets = {
  password?: unknown;
  resetToken?: unknown;
  resetTokenExpires?: unknown;
};

/** パスワードのハッシュやパスワード再設定トークンなど、クライアントに返してはいけない項目を取り除く */
export const omitUserSecrets = <T extends UserSecrets>(
  user: T,
): Omit<T, 'password' | 'resetToken' | 'resetTokenExpires'> => {
  const { password: _password, resetToken: _resetToken, resetTokenExpires: _expires, ...safe } =
    user;
  return safe;
};
