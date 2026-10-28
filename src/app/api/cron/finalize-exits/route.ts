/**
 * 退室の確定（定期実行）
 * cron-job.org から毎分呼ばれ、猶予を過ぎた退室の保留を確定して Discord に通知する。
 * Authorization: Bearer <CRON_SECRET> が必要。
 */
import { NextRequest, NextResponse } from 'next/server';
import { finalizePendingExits } from '@/lib/attendance';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const finalized = await finalizePendingExits();
  return NextResponse.json({ finalized });
}
