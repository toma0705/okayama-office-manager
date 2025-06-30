// GET, POST /api/users
export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// S3クライアント設定
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET_NAME!;

// ユーザー一覧取得API
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
    return NextResponse.json({ error: 'ユーザー一覧取得に失敗しました', detail: String(e) }, { status: 500 });
  }
}

// ユーザー新規登録API（S3アップロード対応）
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

    // S3へアップロード
    const arrayBuffer = await icon.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = icon.name.split('.').pop() || 'png';
    const key = `user-icons/${uuidv4()}.${ext}`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: icon.type,
      // ACL: 'public-read', // S3バケットがACL非対応のため削除
    }));
    const imageUrl = `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    // パスワードをハッシュ化して保存
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
    return NextResponse.json({ error: 'ユーザー登録に失敗しました', detail: String(e) }, { status: 500 });
  }
}
