/**
 * POST /api/users/[id]/arrive — ビーコンの圏内になった（アプリ用）
 * すぐには入室にせず保留にする。流れは lib/attendance.ts の arrive を参照。
 * Web の入室ボタンは /enter ですぐに入室する。
 */
import { NextRequest, NextResponse } from 'next/server';
import { arrive } from '@/lib/attendance';
import { handleRoute, parseIdParam, requireSelf, type IdContext } from '@/lib/http';
import { findUserOrThrow } from '@/lib/user';

export const POST = handleRoute(
  '入室の保留に失敗しました',
  async (req: NextRequest, context: IdContext) => {
    const userId = await parseIdParam(context);
    requireSelf(req, userId);

    const result = await arrive(await findUserOrThrow(userId));
    return NextResponse.json(
      result === 'resumed' ? { status: 'entered', resumed: true } : { status: result },
    );
  },
);
