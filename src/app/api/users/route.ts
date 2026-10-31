/**
 * /api/users
 * GET: ユーザーの一覧（ログイン中のみ）。?officeCode=OKAYAMA でオフィスを絞り込める
 * POST: 新規登録（multipart/form-data）。プロフィール画像は圧縮してストレージ（R2）に保存する
 */
export const runtime = 'nodejs';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALLOWED_EMAIL_DOMAIN } from '@/lib/constants';
import { handleRoute, HttpError, requireAuth } from '@/lib/http';
import { MAX_ICON_SIZE_BYTES, uploadUserIcon } from '@/lib/storage';
import { officeSummarySelect, toPublicUser, withIconUrl } from '@/lib/user';
import { compressImageToLimit, isSupportedImageType } from '@/utils/image';

export const GET = handleRoute('ユーザーリスト取得に失敗しました', async (req: NextRequest) => {
  requireAuth(req);

  const officeCode = req.nextUrl.searchParams.get('officeCode')?.toUpperCase();
  const users = await prisma.user.findMany({
    where: officeCode ? { office: { code: officeCode } } : undefined,
    select: { id: true, name: true, iconFileName: true, office: { select: officeSummarySelect } },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(users.map(withIconUrl));
});

const readFormData = async (req: NextRequest) => {
  try {
    return await req.formData();
  } catch {
    throw new HttpError(400, 'リクエストの形式が正しくありません');
  }
};

/** アップロードされたファイルか（テストの File も含む） */
const isFile = (value: FormDataEntryValue | null): value is File =>
  typeof value === 'object' && value !== null && typeof value.arrayBuffer === 'function';

/** プロフィール画像を上限の容量以下に圧縮してストレージに保存し、保存先のパスを返す */
const saveIcon = async (icon: File) => {
  if (!isSupportedImageType(icon.type)) {
    throw new HttpError(
      400,
      'プロフィール画像は JPEG・PNG・GIF・WebP・HEIC のいずれかを選んでください',
    );
  }

  const compressed = await compressImageToLimit(Buffer.from(await icon.arrayBuffer()), {
    maxBytes: MAX_ICON_SIZE_BYTES,
    mimeType: icon.type,
  });
  if (compressed.buffer.length > MAX_ICON_SIZE_BYTES) {
    const sizeKb = Math.ceil(compressed.buffer.length / 1024);
    const maxKb = Math.floor(MAX_ICON_SIZE_BYTES / 1024);
    throw new HttpError(
      400,
      'プロフィール画像の容量を減らせませんでした',
      `圧縮後のファイルサイズが ${sizeKb}KB で、上限 ${maxKb}KB を超えています。`,
    );
  }

  try {
    const { storagePath } = await uploadUserIcon({
      buffer: compressed.buffer,
      fileName: `${randomUUID()}.${compressed.extension}`,
      contentType: compressed.contentType,
    });
    return storagePath;
  } catch (error) {
    console.error('プロフィール画像のアップロードに失敗しました', error);
    throw new HttpError(500, 'プロフィール画像のアップロードに失敗しました');
  }
};

export const POST = handleRoute('ユーザー登録に失敗しました', async (req: NextRequest) => {
  const formData = await readFormData(req);
  const name = formData.get('name')?.toString();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const officeCode = formData.get('officeCode')?.toString().toUpperCase();
  const icon = formData.get('icon');
  if (!name || !email || !password || !officeCode || !isFile(icon)) {
    throw new HttpError(400, 'name, email, password, icon, officeCode は必須です');
  }

  if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new HttpError(400, `メールアドレスは ${ALLOWED_EMAIL_DOMAIN} ドメインのみ登録可能です`);
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    throw new HttpError(409, 'このメールアドレスは既に登録されています');
  }
  // 画像を保存する前に確かめる（不正なオフィスで画像だけが残らないように）
  const office = await prisma.office.findUnique({ where: { code: officeCode } });
  if (!office) throw new HttpError(400, 'officeCode が不正です');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      iconFileName: await saveIcon(icon),
      officeId: office.id,
    },
    include: { office: { select: officeSummarySelect } },
  });
  // パスワードのハッシュなどは返さない
  return NextResponse.json(toPublicUser(user), { status: 201 });
});
