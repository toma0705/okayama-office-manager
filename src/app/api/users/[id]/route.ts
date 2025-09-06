/**
 * 個別ユーザー管理エンドポイント
 * GET: IDによる単一ユーザー情報取得
 * DELETE: ユーザー削除と関連プロフィール画像の削除
 * PATCH: ユーザーノートの更新
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs/promises';
import path from 'path';

/**
 * 指定されたIDのユーザー情報を取得
 */
export async function GET(_: NextRequest, context: any) {
  const { params } = context;
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
  });

  if (!user) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
  }

  return NextResponse.json(user);
}

/**
 * ユーザー削除処理
 * プロフィール画像ファイルも含めて削除
 */
export async function DELETE(_: NextRequest, context: any) {
  const { params } = context;
  const { id } = await params;
  const userId = Number(id);

  try {
    // 削除前にユーザー情報を取得（プロフィール画像クリーンアップのため）
    const user = await prisma.user.findUnique({ where: { id: userId } });

    // データベースからユーザーを削除
    await prisma.user.delete({ where: { id: userId } });

    // プロフィール画像ファイルが存在する場合は削除
    if (user && user.iconFileName) {
      const filePath = path.join(process.cwd(), 'public/uploads', user.iconFileName);
      try {
        await fs.unlink(filePath);
      } catch {
        // ファイルが存在しない場合は無視
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
  const { note } = await req.json();

  try {
    const user = await prisma.user.update({
      where: { id },
      data: { note },
    });

    return NextResponse.json(user, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: '更新に失敗しました', detail: String(e) }, { status: 500 });
  }
}
