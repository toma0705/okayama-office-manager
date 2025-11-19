import { NextRequest, NextResponse } from 'next/server';

const OKAYAMA_WEBHOOK = process.env.DISCORD_WEBHOOK_URL_OKAYAMA;
const TOKYO_WEBHOOK = process.env.DISCORD_WEBHOOK_URL_TOKYO;

export async function POST(req: NextRequest) {
  if (!OKAYAMA_WEBHOOK) {
    return NextResponse.json(
      { error: 'DISCORD_WEBHOOK_URL_OKAYAMA が設定されていません' },
      { status: 500 },
    );
  }

  const { user, status, officeCode } = await req.json();

  const normalizedOffice = officeCode?.toUpperCase();
  const targetWebhook =
    normalizedOffice === 'TOKYO' && TOKYO_WEBHOOK ? TOKYO_WEBHOOK : OKAYAMA_WEBHOOK;

  const content = `${user} さんが ${status} しました！`;

  await fetch(targetWebhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  return NextResponse.json({ ok: true });
}
