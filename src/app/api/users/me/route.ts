/**
 * GET /api/users/me — ログイン中のユーザーと、同じオフィスで入室中のユーザーの一覧
 * アプリと Web の画面は、この結果で在室状況を表示する。
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { settlePendingAttendance } from '@/lib/attendance';
import { handleRoute, HttpError, requireAuth } from '@/lib/http';
import { officeSummarySelect, toPublicUser, withIconUrl } from '@/lib/user';

export const GET = handleRoute('ユーザー情報の取得に失敗しました', async (req: NextRequest) => {
  const userId = requireAuth(req);

  // 時間を過ぎた入退室の保留を確定してから返す（定期実行が止まっていても表示がずれないように）。
  // 失敗しても在室状況は返す
  await settlePendingAttendance().catch(error =>
    console.warn('入退室の保留の確定に失敗しました', error),
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { office: { select: officeSummarySelect } },
  });
  if (!user) throw new HttpError(404, 'ユーザーが見つかりません');

  const enteredUsers = await prisma.user.findMany({
    where: { entered: true, officeId: user.officeId },
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
      office: { select: officeSummarySelect },
    },
    orderBy: [{ enteredAt: 'asc' }],
  });

  return NextResponse.json({
    user: toPublicUser(user),
    enteredUsers: enteredUsers.map(withIconUrl),
  });
});
