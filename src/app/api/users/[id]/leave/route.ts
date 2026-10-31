/**
 * POST /api/users/[id]/leave — ビーコンの圏外になった（アプリ用）
 * すぐには退室にせず保留にする。流れは lib/attendance.ts の leave を参照。
 * Web の退室ボタンは /exit ですぐに退室する。
 */
import { NextRequest, NextResponse } from 'next/server';
import { leave } from '@/lib/attendance';
import { handleRoute, parseIdParam, requireSelf, type IdContext } from '@/lib/http';
import { findUserOrThrow } from '@/lib/user';

export const POST = handleRoute(
  '退室の保留に失敗しました',
  async (req: NextRequest, context: IdContext) => {
    const userId = await parseIdParam(context);
    requireSelf(req, userId);

    const status = await leave(await findUserOrThrow(userId));
    return NextResponse.json({ status });
  },
);
