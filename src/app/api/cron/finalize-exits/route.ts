/**
 * GET /api/cron/finalize-exits — 入退室の保留の確定（定期実行）
 * cron-job.org から毎分呼ばれ、確認の時間を過ぎた入室の保留と、猶予を過ぎた退室の保留を確定して
 * Discord に通知する（パスは退室の保留だけだったときのまま）。
 * Authorization: Bearer <CRON_SECRET> が必要。
 */
import { NextRequest, NextResponse } from 'next/server';
import { settlePendingAttendance } from '@/lib/attendance';
import { handleRoute, requireCronSecret } from '@/lib/http';

export const GET = handleRoute('入退室の保留の確定に失敗しました', async (req: NextRequest) => {
  requireCronSecret(req);
  return NextResponse.json(await settlePendingAttendance());
});
