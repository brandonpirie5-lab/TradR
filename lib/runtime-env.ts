/** Client-safe flags for production vs local dev tooling. */

export function isProductionApp(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Fake wallet top-ups and dev panels — local only, never on deployed builds. */
export function allowDevWalletTools(stripeEnabled: boolean): boolean {
  return !isProductionApp() && !stripeEnabled;
}

export function walletFundingCopy(stripeEnabled: boolean): string {
  if (stripeEnabled) return 'Secure checkout via Stripe';
  if (isProductionApp()) {
    return 'New accounts include starter balance — card deposits opening soon.';
  }
  return 'Local dev mode — test deposits only.';
}