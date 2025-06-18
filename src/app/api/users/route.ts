export const runtime = "nodejs";
// GET, POST /api/users
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

// ユーザー一覧取得API
export async function GET() {
  // DBから全ユーザーを取得し、JSONで返す
  const users = await prisma.user.findMany({
    include: { enters: true }, // 入退室履歴も含めて返す
  });
  return NextResponse.json(users);
}

// ユーザー新規登録API（画像アップロード対応）
export async function POST(req: NextRequest) {
  // multipart/form-dataで送信されたフォームデータを取得
  const formData = await req.formData();
  // フォームからname, password, icon(画像)を取得
  const name = formData.get('name')?.toString();
  const password = formData.get('password')?.toString();
  const icon = formData.get('icon') as File;

  // 必須項目がなければエラーを返す
  if (!name || !password || !icon) {
    return NextResponse.json({ error: 'name, password, icon 必須' }, { status: 400 });
  }

  // 画像ファイルをバイナリデータとして取得
  const bytes = await icon.arrayBuffer();
  // バイナリデータをNode.jsのBufferに変換
  const buffer = Buffer.from(bytes);
  // 保存するファイル名を生成（重複防止のためタイムスタンプ付与）
  const fileName = `${Date.now()}-${icon.name}`;
  // 保存先のパスを生成
  const filePath = path.join(process.cwd(), 'public/uploads', fileName);
  // 画像ファイルをサーバーのpublic/uploadsに保存
  await writeFile(filePath, buffer);

  // DBに新しいユーザーを作成（画像ファイル名も保存）
  const user = await prisma.user.create({
    data: {
      name,
      password,
      iconFileName: fileName,
    },
    include: {
      enters: true, // ユーザー作成時に入退室履歴も返す（空配列）
    },
  });

  // 作成したユーザー情報を返す
  return NextResponse.json(user, { status: 201 });
}
