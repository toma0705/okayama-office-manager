/**
 * オフィス情報 API
 * GET: 登録フォーム等で選択肢として利用するオフィス一覧を返す
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const offices = await prisma.office.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json(offices);
  } catch (error) {
    console.error('Failed to fetch offices:', error);
    return NextResponse.json(
      { error: 'オフィス一覧の取得に失敗しました', detail: String(error) },
      { status: 500 },
    );
  }
}
