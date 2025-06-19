// POST /api/users/login
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// ユーザーログインAPI
export async function POST(req: NextRequest) {
  // リクエストボディからnameとpasswordを取得
  const { name, password } = await req.json();
  if (!name || !password) {
    // 必須項目がなければエラーを返す
    return NextResponse.json({ error: 'nameとpasswordは必須です' }, { status: 400 });
  }

  // DBからユーザーを検索
  const user = await prisma.user.findFirst({ where: { name, password } });
  if (!user) {
    // ユーザーが見つからなければ認証エラー
    return NextResponse.json({ error: 'ユーザー名またはパスワードが違います' }, { status: 401 });
  }

  // JWTトークンを発行（7日間有効）
  const token = jwt.sign(
    { id: user.id, name: user.name, iconFileName: user.iconFileName },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );

  // ユーザー情報とトークンを返す
  return NextResponse.json({ user, token });
}
