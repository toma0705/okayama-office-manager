/**
 * POST /api/users/[id]/enter — 入室ボタン（Web 用）。すぐに入室にする。
 * 退室の保留中なら、保留を取り消すだけにして入室の時刻を保つ（resumed: true）。
 */
import { NextRequest, NextResponse } from 'next/server';
import { enterNow } from '@/lib/attendance';
import { handleRoute, parseIdParam, requireSelf, type IdContext } from '@/lib/http';
import { findUserOrThrow } from '@/lib/user';

export const POST = handleRoute(
  '入室処理に失敗しました',
  async (req: NextRequest, context: IdContext) => {
    const userId = await parseIdParam(context);
    requireSelf(req, userId);

    const result = await enterNow(await findUserOrThrow(userId));
    return NextResponse.json(
      result === 'resumed'
        ? { message: '入室中に戻りました', resumed: true }
        : { message: '入室しました' },
    );
  },
);
