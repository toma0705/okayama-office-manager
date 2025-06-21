// GET, POST /api/users
export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// ユーザー一覧取得API
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: { enters: true },
    });
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'ユーザー一覧取得に失敗しました' }, { status: 500 });
  }
}

// ユーザー新規登録API（画像アップロード対応）
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const icon = formData.get('icon');

    if (!name || !email || !password || !icon || !(icon instanceof File)) {
      return NextResponse.json({ error: 'name, email, password, icon 必須' }, { status: 400 });
    }

    // emailの重複チェック
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'このメールアドレスは既に登録されています' }, { status: 409 });
    }

    // uploadsディレクトリがなければ作成
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    if (!fs.existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const bytes = await icon.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${icon.name}`;
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // パスワードをハッシュ化せず、そのまま保存
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // ハッシュ化せず保存
        iconFileName: fileName,
      },
      include: {
        enters: true,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'ユーザー登録に失敗しました' }, { status: 500 });
  }
}
