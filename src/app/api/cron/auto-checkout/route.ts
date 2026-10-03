import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDefaultWebhookUrl, resolveWebhookUrl, updateAttendanceBoard } from '@/lib/discord';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await prisma.user.updateMany({
    where: {
      entered: true,
    },
    data: {
      entered: false,
      exitedAt: new Date().toISOString(),
    },
  });

  // 全員退室になったので、各オフィスの在室ボードも更新する
  const defaultWebhook = getDefaultWebhookUrl();
  if (defaultWebhook && result.count > 0) {
    const offices = await prisma.office.findMany({ select: { code: true } });
    for (const office of offices) {
      await updateAttendanceBoard(office.code, resolveWebhookUrl(office.code, defaultWebhook));
    }
  }

  return NextResponse.json({
    success: true,
    updatedCount: result.count,
  });
}
