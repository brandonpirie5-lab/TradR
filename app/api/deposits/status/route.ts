import { isStripeConfigured } from '@/lib/stripe';

export async function GET() {
  return Response.json({ stripe: isStripeConfigured });
}