import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET /api/users/me
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '');
  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as { id: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { enters: true }, // 入退室履歴も返す
    });
    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }
    // 入室中ユーザー一覧も返す例（必要に応じて）
    const enteredUsers = await prisma.user.findMany({
      where: {
        enters: {
          some: {
            exitAt: null,
          },
        },
      },
    });
    return NextResponse.json({ user, enteredUsers });
  } catch {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }
}
