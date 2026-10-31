/**
 * GET /api/cron/nightly-checkout — 毎日 4:00 の一括退室（定期実行）
 * cron-job.org から呼ばれ、入室中の全員を退室にする（Discord には通知しない）。
 * Authorization: Bearer <CRON_SECRET> が必要。
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkoutAllEntered } from '@/lib/attendance';
import { handleRoute, requireCronSecret } from '@/lib/http';

export const GET = handleRoute('一括退室に失敗しました', async (req: NextRequest) => {
  requireCronSecret(req);
  return NextResponse.json({ checkedOut: await checkoutAllEntered() });
});
