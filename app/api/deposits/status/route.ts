import { isStripeConfigured } from '@/lib/stripe';

export async function GET() {
  const stripe = isStripeConfigured;
  const webhook = !!process.env.STRIPE_WEBHOOK_SECRET;
  return Response.json({
    stripe: stripe && webhook,
    configured: stripe,
    webhook,
    ready: stripe && webhook,
  });
}