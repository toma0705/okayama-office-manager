/**
 * /api/users/[id] — 自分のユーザー情報（本人のトークンでのみ操作できる）
 * GET: 取得 / DELETE: 削除（プロフィール画像も消す） / PATCH: メモの更新
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { removeUserIconByUrl } from '@/lib/storage';
import {
  handleRoute,
  HttpError,
  parseIdParam,
  readJson,
  requireSelf,
  type IdContext,
} from '@/lib/http';
import { findUserOrThrow, toPublicUser } from '@/lib/user';

export const GET = handleRoute(
  'ユーザー情報の取得に失敗しました',
  async (req: NextRequest, context: IdContext) => {
    const userId = await parseIdParam(context);
    requireSelf(req, userId);

    return NextResponse.json(toPublicUser(await findUserOrThrow(userId)));
  },
);

export const DELETE = handleRoute(
  '削除に失敗しました',
  async (req: NextRequest, context: IdContext) => {
    const userId = await parseIdParam(context);
    requireSelf(req, userId);

    const user = await findUserOrThrow(userId);
    await prisma.user.delete({ where: { id: userId } });

    // 画像の削除に失敗しても、ユーザーの削除は済んでいるので成功にする
    const removal = await removeUserIconByUrl(user.iconFileName);
    if (removal.error) console.warn('プロフィール画像の削除に失敗しました', removal.error);

    return NextResponse.json({ message: '削除しました' });
  },
);

export const PATCH = handleRoute(
  '更新に失敗しました',
  async (req: NextRequest, context: IdContext) => {
    const userId = await parseIdParam(context);
    requireSelf(req, userId);

    const { note } = await readJson(req);
    if (note !== null && typeof note !== 'string') {
      throw new HttpError(400, 'note は文字列で指定してください');
    }

    const user = await prisma.user.update({ where: { id: userId }, data: { note } });
    return NextResponse.json(toPublicUser(user));
  },
);
