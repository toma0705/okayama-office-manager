/**
 * POST /api/users/[id]/exit — 退室ボタン（Web 用）。すぐに退室にする。
 */
import { NextRequest, NextResponse } from 'next/server';
import { exitNow } from '@/lib/attendance';
import { handleRoute, HttpError, parseIdParam, requireSelf, type IdContext } from '@/lib/http';
import { findUserOrThrow } from '@/lib/user';

export const POST = handleRoute(
  '退室処理に失敗しました',
  async (req: NextRequest, context: IdContext) => {
    const userId = await parseIdParam(context);
    requireSelf(req, userId);

    const exited = await exitNow(await findUserOrThrow(userId));
    if (!exited) throw new HttpError(400, 'すでに退室済みです');
    return NextResponse.json({ message: '退室しました' });
  },
);
