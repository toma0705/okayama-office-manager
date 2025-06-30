// POST /api/users/login
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ユーザーログインAPI
export async function POST(req: NextRequest) {

  // リクエストボディからemailとpasswordを取得
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'emailとpasswordは必須です' }, { status: 400 });

  // DBからユーザーを検索（メールアドレスのみで検索）
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
  
  // パスワードをハッシュと比較
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });

  // JWTトークンを発行（7日間有効）
  const token = jwt.sign(
    { id: user.id, name: user.name, iconFileName: user.iconFileName },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  // ユーザー情報とトークンを返す
  return NextResponse.json({ user, token });
}
