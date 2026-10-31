/**
 * 入退室の保留の確定（定期実行）
 * cron-job.org から毎分呼ばれ、確認の時間を過ぎた入室の保留と、猶予を過ぎた退室の保留を確定して
 * Discord に通知する（パスは退室の保留だけだったときのまま）。
 * Authorization: Bearer <CRON_SECRET> が必要。
 */
import { NextRequest, NextResponse } from 'next/server';
import { settlePendingAttendance } from '@/lib/attendance';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { entered, exited } = await settlePendingAttendance();
  return NextResponse.json({ entered, exited });
}
