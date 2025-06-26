import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";
import fs from "fs/promises";
import path from "path";

const prisma = new PrismaClient();

// ユーザー1件取得API
export async function GET(
  _: NextRequest,
  context: any
) {
  const { params } = await context;
  const user = await prisma.user.findUnique({
    where: { id: Number(params.id) },
  });
  if (!user)
    return NextResponse.json(
      { error: "ユーザーが見つかりません" },
      { status: 404 }
    );
  return NextResponse.json(user);
}

// ユーザー削除API
export async function DELETE(
  _: NextRequest,
  context: any
) {
  const { params } = await context;
  const userId = Number(params.id);
  try {
    // ユーザー情報取得（画像ファイル名取得用）
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // ユーザー本体を削除
    await prisma.user.delete({ where: { id: userId } });
    // 画像ファイルも削除
    if (user && user.iconFileName) {
      const filePath = path.join(process.cwd(), "public/uploads", user.iconFileName);
      try {
        await fs.unlink(filePath);
      } catch {
        // ファイルが存在しない場合は無視
      }
    }
    return NextResponse.json({ message: "削除しました" }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "削除失敗", detail: String(e) },
      { status: 500 }
    );
  }
}

// テキストボックスAPI
export async function PATCH(
  req: NextRequest,
  context: any
) {
  const { params } = await context;
  const id = Number(params.id);
  const { note } = await req.json();
  try {
    const user = await prisma.user.update({
      where: { id },
      data: { note },
    });
    return NextResponse.json(user, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { error: "更新に失敗しました", detail: String(e) },
      { status: 500 }
    );
  }
}
