import { getAppUrl } from './app-url';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

/** Live when secret is set. Also needs STRIPE_WEBHOOK_SECRET on Vercel + Stripe dashboard webhook. */
export const isStripeConfigured = !!STRIPE_SECRET;

export const DEPOSIT_AMOUNTS = [10, 25, 50] as const;

export async function createCheckoutSession(params: {
  userId: string;
  email: string;
  amountUsd: number;
}): Promise<{ url: string; sessionId: string }> {
  if (!STRIPE_SECRET) throw new Error('Stripe is not configured');

  const amountCents = Math.round(params.amountUsd * 100);
  const body = new URLSearchParams({
    mode: 'payment',
    success_url: `${getAppUrl()}/?deposit=success&amount=${params.amountUsd}`,
    cancel_url: `${getAppUrl()}/?deposit=cancelled`,
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': String(amountCents),
    'line_items[0][price_data][product_data][name]': `TradR Pit Wallet — $${params.amountUsd}`,
    'line_items[0][price_data][product_data][description]': 'Arena entry fee balance',
    'line_items[0][quantity]': '1',
    'metadata[user_id]': params.userId,
    'metadata[amount_usd]': String(params.amountUsd),
    customer_email: params.email,
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Stripe checkout failed');
  }

  return { url: data.url, sessionId: data.id };
}