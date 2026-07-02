import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — TradR Pit',
  description: 'How TradR Pit handles your data.',
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <div className="legal-page-inner">
        <Link href="/" className="legal-back">
          ← Back to TradR Pit
        </Link>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: July 2026</p>

        <section>
          <h2>What we collect</h2>
          <p>
            Account email, display name, wallet balance, contest entries, trades, rankings, and
            activity needed to run multiplayer pits and leaderboards.
          </p>
        </section>

        <section>
          <h2>How we use it</h2>
          <p>
            To authenticate you, run contests, show live leaderboards and tape feeds, process
            payouts to your TradR balance, and prevent abuse.
          </p>
        </section>

        <section>
          <h2>Sharing</h2>
          <p>
            Your display name, rank, and trades may appear on public leaderboards and live tape feeds
            during contests. We do not sell your personal information.
          </p>
        </section>

        <section>
          <h2>Storage</h2>
          <p>
            Data is stored via our cloud database provider (Supabase). Payment processing, when
            enabled, will be handled by Stripe under their privacy policy.
          </p>
        </section>

        <section>
          <h2>Retention</h2>
          <p>
            Account and contest data are kept while your account is active. You may request deletion
            by emailing support@tradr.app.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>Questions or data requests: support@tradr.app</p>
        </section>
      </div>
    </main>
  );
}