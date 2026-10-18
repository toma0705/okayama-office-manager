/**
 * ユーザー認証エンドポイント
 * ユーザーの認証情報を検証してJWTトークンを発行
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getJwtSecret } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { resolveUserIconUrl } from '@/lib/storage';
import { omitUserSecrets } from '@/lib/user';

// JWTトークンの有効期限（180日間）
// アプリはほとんど開かれず、バックグラウンドの自動入退室もこのトークンを使うため長めにしている
const JWT_EXPIRES_IN = '180d';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'emailとpasswordは必須です' }, { status: 400 });
  }

  // メールアドレスでユーザーを検索
  const user = await prisma.user.findFirst({
    where: { email },
    include: {
      office: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json(
      { error: 'メールアドレスまたはパスワードが違います' },
      { status: 401 },
    );
  }

  // パスワード照合
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return NextResponse.json(
      { error: 'メールアドレスまたはパスワードが違います' },
      { status: 401 },
    );
  }

  // JWTトークン生成（180日間有効）
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

  const userSafe = omitUserSecrets(user);
  return NextResponse.json({
    user: {
      ...userSafe,
      iconFileName: resolveUserIconUrl(userSafe.iconFileName) ?? userSafe.iconFileName,
    },
    token,
  });
}
