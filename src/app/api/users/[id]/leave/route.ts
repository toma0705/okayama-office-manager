/**
 * 退室の保留エンドポイント（アプリのビーコン検知用）
 * ビーコンの圏外になったときに呼ばれる。すぐには退室にせず、猶予の間に戻らなければ
 * finalizePendingExits が退室を確定して Discord に通知する。
 * Web の退室ボタンは、これまでどおり /exit ですぐに退室する。
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUserId } from '@/lib/auth';

export async function POST(req: NextRequest, context: any) {
  const { params } = context;
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) {
    return NextResponse.json({ error: '不正なIDです' }, { status: 400 });
  }

  try {
    const authenticatedUserId = getAuthenticatedUserId(req);

    if (!authenticatedUserId) {
      return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
    }

    if (authenticatedUserId !== userId) {
      return NextResponse.json({ error: '他ユーザーの退室は操作できません' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (!user.entered) {
      return NextResponse.json({ status: 'exited' }, { status: 200 });
    }

    // 保留中なら最初に圏外になった時刻を保つ
    if (!user.exitPendingSince) {
      await prisma.user.update({
        where: { id: userId },
        data: { exitPendingSince: new Date() },
      });
    }

    return NextResponse.json({ status: 'pending' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: '退室の保留に失敗しました' }, { status: 500 });
  }
}
