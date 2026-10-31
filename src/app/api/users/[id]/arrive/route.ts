/**
 * 入室の保留エンドポイント（アプリのビーコン検知用）
 * ビーコンの圏内になったときに呼ばれる。前を通っただけの人を入室にしないよう、すぐには入室にせず、
 * 確認の時間の間に圏外にならなければ confirmPendingEnters が入室を確定して Discord に通知する。
 * 退室の保留中（猶予の間に戻ってきた）なら、保留を取り消して入室中に戻す（Discord には通知しない）。
 * Web の入室ボタンは、これまでどおり /enter ですぐに入室する。
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
      return NextResponse.json({ error: '他ユーザーの入室は操作できません' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (user.entered) {
      // 入室の時刻を保ったまま、退室の保留を取り消す
      if (user.exitPendingSince) {
        await prisma.user.update({
          where: { id: userId },
          data: { exitPendingSince: null },
        });
        return NextResponse.json({ status: 'entered', resumed: true }, { status: 200 });
      }
      return NextResponse.json({ status: 'entered' }, { status: 200 });
    }

    // 保留中なら最初に圏内になった時刻を保つ
    if (!user.enterPendingSince) {
      await prisma.user.update({
        where: { id: userId },
        data: { enterPendingSince: new Date() },
      });
    }

    return NextResponse.json({ status: 'pending' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: '入室の保留に失敗しました' }, { status: 500 });
  }
}
