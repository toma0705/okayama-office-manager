/**
 * ユーザープロフィールと入室中ユーザー取得エンドポイント
 * 認証されたユーザーの情報と現在入室中のユーザーリストを返す
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { settlePendingAttendance } from '@/lib/attendance';
import { getAuthenticatedUserId } from '@/lib/auth';
import { resolveUserIconUrl } from '@/lib/storage';
import { omitUserSecrets } from '@/lib/user';

export async function GET(req: NextRequest) {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
    }

    // 時間を過ぎた入退室の保留を確定してから在室状況を返す（定期実行が止まっていても表示がずれないように）。
    // 失敗しても在室状況は返す（この API の失敗はアプリではログアウト扱いになるため）
    await settlePendingAttendance().catch(error =>
      console.warn('Failed to settle pending attendance', error),
    );

    // 認証されたユーザー情報を取得
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    return NextResponse.json({
      user: {
        ...omitUserSecrets(user),
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
