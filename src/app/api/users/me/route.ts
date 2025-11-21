/**
 * ユーザープロフィールと入室中ユーザー取得エンドポイント
 * 認証されたユーザーの情報と現在入室中のユーザーリストを返す
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { JwtPayload } from '@/types/declaration';
import jwt from 'jsonwebtoken';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');

  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
  }

  const token = auth.replace('Bearer ', '');

  try {
    const secret = process.env.JWT_SECRET || 'secret';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    // 認証されたユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 現在入室中のユーザーリストを取得
    const enteredUsers = await prisma.user.findMany({
      where: {
        entered: true,
        officeId: user.officeId,
      },
      select: {
        id: true,
        name: true,
        iconFileName: true,
        note: true,
        enteredAt: true,
        exitedAt: true,
        entered: true,
        email: true,
        officeId: true,
        office: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [{ enteredAt: 'asc' }],
    });

    return NextResponse.json({ user, enteredUsers });
  } catch {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }
}
