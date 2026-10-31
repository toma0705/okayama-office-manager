/**
 * 深夜の一括退室（定期実行）
 * cron-job.org から毎日 4:00（日本時間）に呼ばれ、入室中の全員を退室にする。
 * 退室を取りこぼした人が何日も入室中のまま残らないようにするため。Discord には通知しない。
 * Authorization: Bearer <CRON_SECRET> が必要。
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkoutAllEntered } from '@/lib/attendance';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const checkedOut = await checkoutAllEntered();
  return NextResponse.json({ checkedOut });
}
