/**
 * ユーザープロフィールと入室中ユーザー取得エンドポイント
 * 認証されたユーザーの情報と現在入室中のユーザーリストを返す
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';
import { resolveUserIconUrl } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
    }

    // 認証されたユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        office: {
          select: {
            id: true,
            code: true,
            name: true,
            latitude: true,
            longitude: true,
            radiusMeters: true,
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
            latitude: true,
            longitude: true,
            radiusMeters: true,
          },
        },
      },
      orderBy: [{ enteredAt: 'asc' }],
    });

    return NextResponse.json({
      user: {
        ...user,
        iconFileName: resolveUserIconUrl(user.iconFileName) ?? user.iconFileName,
      },
      enteredUsers: enteredUsers.map(enteredUser => ({
        ...enteredUser,
        iconFileName:
          resolveUserIconUrl(enteredUser.iconFileName) ?? enteredUser.iconFileName,
      })),
    });
  } catch {
    return NextResponse.json({ error: '認証エラー' }, { status: 401 });
  }
}
