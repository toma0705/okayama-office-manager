/**
 * ユーザー認証エンドポイント
 * ユーザーの認証情報を検証してJWTトークンを発行
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// JWTトークンの有効期限（7日間）
const JWT_EXPIRES_IN = '7d';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'emailとpasswordは必須です' }, { status: 400 });
  }

  // メールアドレスでユーザーを検索
  const user = await prisma.user.findFirst({ where: { email } });
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

  // JWTトークン生成（7日間有効）
  const token = jwt.sign(
    { id: user.id, name: user.name, iconFileName: user.iconFileName },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: JWT_EXPIRES_IN },
  );

  return NextResponse.json({ user, token });
}
