/**
 * 個別ユーザー管理エンドポイント
 * GET: IDによる単一ユーザー情報取得
 * DELETE: ユーザー削除と関連プロフィール画像の削除
 * PATCH: ユーザーノートの更新
 * いずれも本人のログイン用トークンでのみ操作できる
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { removeUserIconByUrl, resolveUserIconUrl } from '@/lib/storage';
import { getAuthenticatedUserId } from '@/lib/auth';
import { omitUserSecrets } from '@/lib/user';

const withResolvedIcon = <T extends { iconFileName?: string | null }>(user: T): T => {
  if (typeof user.iconFileName !== 'string') {
    return user;
  }

  return {
    ...user,
    iconFileName: resolveUserIconUrl(user.iconFileName) ?? user.iconFileName,
  };
};

/** 本人のトークンかを確認する。問題があればエラーのレスポンスを返す */
const requireSelf = (req: NextRequest, userId: number): NextResponse | null => {
  if (isNaN(userId)) {
    return NextResponse.json({ error: '不正なIDです' }, { status: 400 });
  }

  let authenticatedUserId: number | null = null;
  try {
    authenticatedUserId = getAuthenticatedUserId(req);
  } catch {
    authenticatedUserId = null;
  }

  if (!authenticatedUserId) {
    return NextResponse.json({ error: '認証情報がありません' }, { status: 401 });
  }
  if (authenticatedUserId !== userId) {
    return NextResponse.json({ error: '他のユーザーは操作できません' }, { status: 403 });
  }
  return null;
};

/**
 * 指定されたIDのユーザー情報を取得
 */
export async function GET(req: NextRequest, context: any) {
  const { params } = context;
  const { id } = await params;
  const userId = Number(id);

  const denied = requireSelf(req, userId);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
  }

  return NextResponse.json(withResolvedIcon(omitUserSecrets(user)));
}

/**
 * ユーザー削除処理
 * プロフィール画像ファイルも含めて削除
 */
export async function DELETE(req: NextRequest, context: any) {
  const { params } = context;
  const { id } = await params;
  const userId = Number(id);

  const denied = requireSelf(req, userId);
  if (denied) return denied;

  try {
    // 削除前にユーザー情報を取得（プロフィール画像クリーンアップのため）
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // データベースからユーザーを削除
    await prisma.user.delete({ where: { id: userId } });

    // プロフィール画像ファイルが存在する場合は削除
    if (user && user.iconFileName) {
      try {
        const removalResult = await removeUserIconByUrl(user.iconFileName);

        if (removalResult.error) {
          console.warn('Storage icon deletion failed:', removalResult.error);
        }
      } catch (error) {
        console.warn('プロフィール画像削除処理でエラーが発生しました:', error);
      }
    }

    return NextResponse.json({ message: '削除しました' }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: '削除失敗', detail: String(e) }, { status: 500 });
  }
}

/**
 * ユーザーノートの更新
 */
export async function PATCH(req: NextRequest, context: any) {
  const { params } = context;
  const { id: idStr } = await params;
  const id = Number(idStr);

  const denied = requireSelf(req, id);
  if (denied) return denied;

  const { note } = await req.json();
  if (note !== null && typeof note !== 'string') {
    return NextResponse.json({ error: 'note は文字列で指定してください' }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { note },
    });

    return NextResponse.json(withResolvedIcon(omitUserSecrets(user)), { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: '更新に失敗しました', detail: String(e) }, { status: 500 });
  }
}
