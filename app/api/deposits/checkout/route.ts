import { NextRequest } from 'next/server';
import { getUserFromRequest, unauthorizedResponse, badRequestResponse } from '@/lib/auth';
import { createCheckoutSession, DEPOSIT_AMOUNTS, isStripeConfigured } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  if (!isStripeConfigured) {
    return Response.json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to env.' }, { status: 503 });
  }

  const user = await getUserFromRequest(request);
  if (!user) return unauthorizedResponse();

  let body: { amount?: number };
  try {
    body = await request.json();
  } catch {
    return badRequestResponse('Invalid JSON body');
  }

  const amount = Number(body.amount);
  if (!DEPOSIT_AMOUNTS.includes(amount as (typeof DEPOSIT_AMOUNTS)[number])) {
    return badRequestResponse(`Amount must be one of: ${DEPOSIT_AMOUNTS.join(', ')}`);
  }

  const session = await createCheckoutSession({
    userId: user.id,
    email: user.email || '',
    amountUsd: amount,
  });

  return Response.json({ url: session.url, sessionId: session.sessionId });
}