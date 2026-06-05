import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

  return NextResponse.json({
    success: true,
    updatedCount: result.count,
  });
}
