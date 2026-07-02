/** Canonical app URL for OG, Stripe redirects, share links. */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tradr-green.vercel.app')
  );
}