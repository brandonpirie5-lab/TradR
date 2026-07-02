import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createHmac, timingSafeEqual } from 'crypto';

function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;

  const signed = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', secret).update(signed).digest('hex');

  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return Response.json({ error: 'Webhook secret not configured' }, { status: 503 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return Response.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const body = await request.text();
  if (!verifyStripeSignature(body, signature, webhookSecret)) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);
  if (event.type !== 'checkout.session.completed') {
    return Response.json({ received: true });
  }

  const session = event.data.object;
  const sessionId = session.id as string;
  const userId = session.metadata?.user_id;
  const amountUsd = Number(session.metadata?.amount_usd || 0);
  const paymentStatus = session.payment_status as string | undefined;

  if (!userId || amountUsd <= 0) {
    return Response.json({ error: 'Invalid session metadata' }, { status: 400 });
  }

  if (paymentStatus && paymentStatus !== 'paid') {
    return Response.json({ received: true, skipped: paymentStatus });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const { data: prior } = await admin
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'deposit')
    .ilike('description', `%session ${sessionId}%`)
    .limit(1)
    .maybeSingle();

  if (prior) {
    return Response.json({ received: true, duplicate: true });
  }

  const { data: profile } = await admin.from('profiles').select('balance').eq('id', userId).single();
  const newBalance = Number(profile?.balance || 0) + amountUsd;

  await admin.from('profiles').update({ balance: newBalance }).eq('id', userId);
  await admin.from('transactions').insert({
    user_id: userId,
    type: 'deposit',
    amount: amountUsd,
    description: `Stripe deposit (session ${session.id})`,
  });

  return Response.json({ received: true, credited: amountUsd });
}