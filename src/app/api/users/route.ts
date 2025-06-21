// GET, POST /api/users
export const runtime = "nodejs";
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma/client';
import cloudinary from 'cloudinary';

const prisma = new PrismaClient();

// Cloudinary設定
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// ユーザー新規登録API（Cloudinaryアップロード対応）
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

    // Cloudinaryへアップロード
    const arrayBuffer = await icon.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadResult = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.v2.uploader.upload_stream(
        { folder: 'user-icons' },
        (error, result) => {
          if (error || !result) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });
    const imageUrl = uploadResult.secure_url;

    // パスワードをハッシュ化せず、そのまま保存
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password, // ハッシュ化せず保存
        iconFileName: imageUrl, // カラム名をiconUrl等にリネーム推奨
      },
      include: {
        enters: true,
      },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'ユーザー登録に失敗しました', detail: String(e) }, { status: 500 });
  }
}
