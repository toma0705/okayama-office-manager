/**
 * ユーザー管理API
 * GET: ユーザーリストの取得（登録ページ用）
 * POST: 新規ユーザー登録とプロフィール画像のアップロード
 */
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { MAX_ICON_SIZE_BYTES, uploadUserIcon } from '@/lib/storage';
import { compressImageToLimit } from '@/utils/image';

/**
 * ユーザーリスト取得API
 * 登録ページで表示するための基本情報のみ取得
 */
export async function GET(req: NextRequest) {
  const officeCode = req.nextUrl.searchParams.get('officeCode')?.toUpperCase();
  try {
    const users = await prisma.user.findMany({
      where: officeCode
        ? {
            office: {
              code: officeCode,
            },
          }
        : undefined,
      select: {
        id: true,
        name: true,
        iconFileName: true,
        office: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(users);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'ユーザーリスト取得に失敗しました', detail: String(e) },
      { status: 500 },
    );
  }
}

/**
 * ユーザー新規登録API
 * プロフィール画像をSupabase Storageにアップロードしてユーザー情報をDBに保存
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const icon = formData.get('icon');
    const officeCode = formData.get('officeCode')?.toString().toUpperCase();

    // Node.jsテスト環境のMockFile対応: File/Blobの型判定を緩和
    const isFileLike = (f: any) =>
      f &&
      typeof f === 'object' &&
      typeof f.arrayBuffer === 'function' &&
      typeof f.name === 'string';
    if (!name || !email || !password || !icon || !isFileLike(icon) || !officeCode) {
      return NextResponse.json(
        { error: 'name, email, password, icon, officeCode は必須です' },
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
    const fileObj = icon as any;
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await fileObj.arrayBuffer();
    } catch (e) {
      return NextResponse.json(
        { error: 'ファイル読み込みに失敗しました', detail: String(e) },
        { status: 500 },
      );
    }
    const buffer = Buffer.from(arrayBuffer);

    const ext = fileObj.name.split('.').pop() || 'png';
    const originalContentType = fileObj.type || 'application/octet-stream';

    const compressed = await compressImageToLimit(buffer, {
      maxBytes: MAX_ICON_SIZE_BYTES,
      mimeType: originalContentType,
    });

    if (compressed.buffer.length > MAX_ICON_SIZE_BYTES) {
      const sizeKb = Math.ceil(compressed.buffer.length / 1024);
      const maxKb = Math.floor(MAX_ICON_SIZE_BYTES / 1024);
      return NextResponse.json(
        {
          error: 'プロフィール画像の容量を減らせませんでした',
          detail: `圧縮後のファイルサイズが ${sizeKb}KB で、上限 ${maxKb}KB を超えています。`,
        },
        { status: 400 },
      );
    }

    const finalExtension = compressed.wasCompressed ? compressed.extension : ext;
    const finalContentType = compressed.contentType || originalContentType;
    const fileName = `${uuidv4()}.${finalExtension}`;

    let imageUrl: string;
    try {
      const { publicUrl } = await uploadUserIcon({
        buffer: compressed.buffer,
        fileName,
        contentType: finalContentType,
      });
      imageUrl = publicUrl;
    } catch (error) {
      console.error('Supabase Storage upload failed:', error);
      return NextResponse.json(
        { error: 'プロフィール画像のアップロードに失敗しました', detail: String(error) },
        { status: 500 },
      );
    }

    // パスワードをハッシュ化してユーザー作成
    const hashedPassword = await bcrypt.hash(password, 10);
    const office = await prisma.office.findUnique({
      where: { code: officeCode },
    });
    if (!office) {
      return NextResponse.json({ error: 'officeCode が不正です' }, { status: 400 });
    }
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        iconFileName: imageUrl,
        officeId: office.id,
      },
      include: {
        office: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
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
