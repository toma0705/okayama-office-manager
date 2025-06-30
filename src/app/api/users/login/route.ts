// POST /api/users/login
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ユーザーログインAPI
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  // リクエストボディからemailとpasswordを取得
  const { email, password } = await req.json();
  if (!email || !password) {
    // 必須項目がなければエラーを返す
    return NextResponse.json({ error: 'emailとpasswordは必須です' }, { status: 400 });
  }

  // DBからユーザーを検索（メールアドレスのみで検索）
  const dbStartTime = Date.now();
  const user = await prisma.user.findFirst({ where: { email } });
  console.log(`DB query time: ${Date.now() - dbStartTime}ms`);
  
  if (!user) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
  }
  
  // パスワードをハッシュと比較
  const bcryptStartTime = Date.now();
  const isValid = await bcrypt.compare(password, user.password);
  console.log(`bcrypt compare time: ${Date.now() - bcryptStartTime}ms`);
  
  if (!isValid) {
    return NextResponse.json({ error: 'メールアドレスまたはパスワードが違います' }, { status: 401 });
  }

  // JWTトークンを発行（7日間有効）
  const jwtStartTime = Date.now();
  const token = jwt.sign(
    { id: user.id, name: user.name, iconFileName: user.iconFileName },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
  console.log(`JWT sign time: ${Date.now() - jwtStartTime}ms`);

  console.log(`Total login time: ${Date.now() - startTime}ms`);

  // ユーザー情報とトークンを返す
  return NextResponse.json({ user, token });
}
