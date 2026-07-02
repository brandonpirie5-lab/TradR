import type { Metadata } from 'next';
import Link from 'next/link';
import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES, DAILY_MAX_TRADES } from '@/lib/daily-pit-config';
import { PLATFORM_RAKE_PCT } from '@/lib/pit-pool-math';
import { formatDailyPitScheduleLabel } from '@/lib/daily-pit-schedule';

export const metadata: Metadata = {
  title: 'Terms of Service — TradR Pit',
  description: 'Terms for TradR Pit daily fantasy trading contests.',
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <div className="legal-page-inner">
        <Link href="/" className="legal-back">
          ← Back to TradR Pit
        </Link>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: July 2026</p>

        <section>
          <h2>What TradR Pit is</h2>
          <p>
            TradR Pit is a skill-based fantasy trading contest. You pay an entry fee from your TradR
            wallet, receive a virtual portfolio, and compete on a live leaderboard. No real money is
            invested in the market during the contest.
          </p>
        </section>

        <section>
          <h2>Daily Pit</h2>
          <p>
            One contest runs per calendar day ({formatDailyPitScheduleLabel()}). Entry is $
            {DAILY_ENTRY_FEE}. The prize pool equals entry fees collected minus {PLATFORM_RAKE_PCT}%
            platform fee. The top half of the field splits the pool equally. Minimum{' '}
            {DAILY_MIN_ENTRIES} traders required or the pit voids and entry fees refund.
          </p>
        </section>

        <section>
          <h2>Ring in early</h2>
          <p>
            You may ring in before the opening bell to lock your spot for that day&apos;s pit. This
            is not a separate &quot;week schedule&quot; of multiple contests — it is one pit per day.
            Early entry guarantees your seat until the contest fills ({DAILY_MIN_ENTRIES}–50 traders)
            or the join cutoff (final 5 minutes before the bell).
          </p>
        </section>

        <section>
          <h2>Eligibility</h2>
          <p>
            You must be 18 or older. Contest availability may vary by state or region. One account
            per person. Collusion, multi-accounting, or manipulation may void prizes.
          </p>
        </section>

        <section>
          <h2>Balances &amp; payouts</h2>
          <p>
            Entry fees deduct from your TradR balance at ring-in. Prizes credit after settlement.
            TradR may correct errors, void results for abuse, or refund entries when a pit does not
            run.
          </p>
        </section>

        <section>
          <h2>Trading limits</h2>
          <p>
            Each Daily Pit allows up to {DAILY_MAX_TRADES} trades per trader. Quotes must be fresh;
            fills may be rejected if prices move beyond allowed slippage.
          </p>
        </section>

        <section>
          <h2>Referrals</h2>
          <p>
            Referral bonuses credit to TradR wallet balance when an invited user rings in their first
            pit. Abuse (self-referral, multi-accounting) voids bonuses.
          </p>
        </section>

        <section>
          <h2>Disclaimer</h2>
          <p>
            TradR Pit is a skill-based fantasy trading contest, not securities trading. Contest
            availability may vary by region. Contact support@tradr.app for account issues.
          </p>
        </section>
      </div>
    </main>
  );
}