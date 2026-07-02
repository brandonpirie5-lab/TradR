import { NextRequest } from 'next/server';

/** Lightweight client error logging for soft launch — wire to Sentry later. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.error('[client-error]', {
      at: new Date().toISOString(),
      message: body.message,
      stack: body.stack,
      component: body.component,
      ua: request.headers.get('user-agent'),
    });
  } catch {
    /* ignore malformed */
  }
  return Response.json({ ok: true });
}