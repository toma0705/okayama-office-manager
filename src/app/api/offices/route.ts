/**
 * GET /api/offices — オフィスの一覧（登録フォームやユーザー一覧の絞り込みで使う）
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleRoute } from '@/lib/http';
import { officeSummarySelect } from '@/lib/user';

export const GET = handleRoute('オフィス一覧の取得に失敗しました', async () => {
  const offices = await prisma.office.findMany({
    select: officeSummarySelect,
    orderBy: { id: 'asc' },
  });
  return NextResponse.json(offices);
});
