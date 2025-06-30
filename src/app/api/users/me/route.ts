import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

// GET /api/users/me
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "認証情報がありません" },
      { status: 401 }
    );
  }
  const token = auth.replace("Bearer ", "");
  try {
    const secret = process.env.JWT_SECRET || "secret";
    const decoded = jwt.verify(token, secret) as { id: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!user) {
      return NextResponse.json(
        { error: "ユーザーが見つかりません" },
        { status: 404 }
      );
    }
    // 入室中ユーザー一覧（Userテーブルのenteredがtrueなユーザー）
    const enteredUsers = await prisma.user.findMany({
      where: { entered: true },
      select: {
        id: true,
        name: true,
        iconFileName: true,
        note: true,
        enteredAt: true,
        exitedAt: true,
        entered: true,
        email: true,
      },
    });
    return NextResponse.json({ user, enteredUsers });
  } catch {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }
}
