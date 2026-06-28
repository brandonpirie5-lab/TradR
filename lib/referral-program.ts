/** TradR Pit referral program — recommended structure (UI + future backend). */

export const REFERRAL_TIERS = {
  /** Friend who signs up via your link */
  friendSignupBonus: 5,
  /** You when a friend signs up */
  referrerSignupBonus: 5,
  /** % of referred user's entry fees — first 90 days */
  directEntryFeePct: 2.0,
  /** % of second-degree (friend-of-friend) entry fees — first 30 days */
  secondDegreeEntryFeePct: 0.75,
  /** One-time bonus when referred friend makes first paid entry */
  firstPaidEntryBonus: 5,
  /** Cap per referred user per month */
  monthlyCapPerReferral: 50,
} as const;

export const REFERRAL_HIGHLIGHTS = [
  {
    icon: 'gift',
    title: 'Instant welcome',
    detail: `Friends get $${REFERRAL_TIERS.friendSignupBonus} credit the moment they sign up.`,
  },
  {
    icon: 'ticket',
    title: 'First pit bonus',
    detail: `You earn $${REFERRAL_TIERS.firstPaidEntryBonus} when they enter their first paid arena.`,
  },
  {
    icon: 'percent',
    title: 'Ongoing rake-back',
    detail: `${REFERRAL_TIERS.directEntryFeePct}% of their entry fees for 90 days (cap $${REFERRAL_TIERS.monthlyCapPerReferral}/mo per friend).`,
  },
  {
    icon: 'network',
    title: 'Second-degree',
    detail: `${REFERRAL_TIERS.secondDegreeEntryFeePct}% when your invitees bring their own friends (30 days).`,
  },
] as const;

/**
 * Why this beats flat % only:
 * - Signup bonus hooks the friend immediately (conversion).
 * - First-paid-entry bonus rewards quality referrals, not empty signups.
 * - Ongoing % ties earnings to activity (retention).
 * - Second-degree is lower (0.75%) to limit abuse but still viral.
 */
export const REFERRAL_VS_SWAPROYALE = [
  'Transparent tier breakdown — users see exactly what they earn.',
  'Activity-linked rewards keep invitees trading, not just signing up.',
  'Monthly caps prevent whale-farming while staying generous for real growth.',
];