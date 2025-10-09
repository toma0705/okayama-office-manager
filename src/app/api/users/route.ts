/**
 * ユーザー管理API
 * GET: ユーザー一覧の取得（登録ページ用）
 * POST: 新規ユーザー登録とプロフィール画像のアップロード
 */
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// AWS S3クライアント設定（本番環境用）
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET_NAME!;

/**
 * ユーザー一覧取得API
 * 登録ページで表示するための基本情報のみ取得
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        iconFileName: true,
      },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'ユーザー一覧取得に失敗しました', detail: String(e) },
      { status: 500 },
    );
  }
}

/**
 * ユーザー新規登録API
 * プロフィール画像をS3にアップロードしてユーザー情報をDBに保存
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const icon = formData.get('icon');

    if (!name || !email || !password || !icon || !(icon instanceof File)) {
      return NextResponse.json(
        { error: 'name, email, password, icon は必須です' },
        { status: 400 },
      );
    }

    // メールアドレスの重複チェック
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 409 },
      );
    }

    // プロフィール画像のアップロード処理
    const arrayBuffer = await icon.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = icon.name.split('.').pop() || 'png';
    const fileName = `${uuidv4()}.${ext}`;

    let imageUrl: string;

    if (process.env.NODE_ENV === 'development') {
      // 開発環境：ローカルファイルシステムに保存
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

      // uploadsディレクトリが存在しない場合は作成
      try {
        await fs.access(uploadsDir);
      } catch {
        await fs.mkdir(uploadsDir, { recursive: true });
      }

      const filePath = path.join(uploadsDir, fileName);
      await fs.writeFile(filePath, buffer);
      imageUrl = `/uploads/${fileName}`;
    } else {
      // 本番環境：S3にアップロード
      const key = `user-icons/${fileName}`;
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: buffer,
          ContentType: icon.type,
        }),
      );
      imageUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }

    // パスワードをハッシュ化してユーザー作成
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        iconFileName: imageUrl,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    console.error('ユーザー登録エラー:', e);
    return NextResponse.json(
      { error: 'ユーザー登録に失敗しました', detail: String(e) },
      { status: 500 },
    );
  }
}
