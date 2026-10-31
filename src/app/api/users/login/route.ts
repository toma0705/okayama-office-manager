/**
 * POST /api/users/login — ログイン。メールアドレスとパスワードを確かめて JWT を発行する
 */
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/auth';
import { handleRoute, HttpError, readJson, stringField } from '@/lib/http';
import { officeSummarySelect, toPublicUser } from '@/lib/user';

// JWT の有効期限。アプリはほとんど開かれず、バックグラウンドの自動入退室も
// このトークンを使うため長めにしている
const JWT_EXPIRES_IN = '180d';

const INVALID_CREDENTIALS = 'メールアドレスまたはパスワードが違います';

export const POST = handleRoute('ログインに失敗しました', async (req: NextRequest) => {
  const body = await readJson(req);
  const email = stringField(body, 'email');
  const password = stringField(body, 'password');
  if (!email || !password) {
    throw new HttpError(400, 'emailとpasswordは必須です');
  }

  const user = await prisma.user.findFirst({
    where: { email },
    include: { office: { select: officeSummarySelect } },
  });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      iconFileName: user.iconFileName,
      officeId: user.officeId,
      officeCode: user.office.code,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN },
  );

  return NextResponse.json({ user: toPublicUser(user), token });
});
