import type { Metadata } from 'next';
import Link from 'next/link';
import { DAILY_ENTRY_FEE, DAILY_MIN_ENTRIES } from '@/lib/daily-pit-config';
import { formatDailyPitScheduleLabel } from '@/lib/daily-pit-schedule';

export const metadata: Metadata = {
  title: 'Support — TradR Pit',
  description: 'Help with TradR Pit daily trading contests.',
};

const FAQ = [
  {
    q: 'How do I ring in?',
    a: `Go to Arena and tap Ring in · $${DAILY_ENTRY_FEE}. You can ring in early before 9:30 AM ET — your ticket shows in Battles → Upcoming.`,
  },
  {
    q: 'When does the pit run?',
    a: formatDailyPitScheduleLabel() + '. One pit per calendar day.',
  },
  {
    q: 'What if not enough traders join?',
    a: `Need at least ${DAILY_MIN_ENTRIES} traders or the pit voids and your $${DAILY_ENTRY_FEE} entry refunds to your wallet.`,
  },
  {
    q: 'Forgot password?',
    a: 'Profile → Sign in → Forgot password. Check spam for the reset email.',
  },
  {
    q: 'Deposits',
    a: 'New accounts include starter balance for soft launch. Card deposits via Stripe will appear in Profile when enabled.',
  },
] as const;

export default function SupportPage() {
  return (
    <main className="legal-page">
      <div className="legal-page-inner">
        <Link href="/" className="legal-back">
          ← Back to TradR Pit
        </Link>
        <h1>Support</h1>
        <p className="legal-updated">Soft launch · July 2026</p>

        <section>
          <h2>Contact</h2>
          <p>
            Email{' '}
            <a href="mailto:support@tradr.app" className="legal-inline-link">
              support@tradr.app
            </a>{' '}
            — account issues, refunds, abuse reports. We respond within 1–2 business days.
          </p>
        </section>

        <section>
          <h2>FAQ</h2>
          <dl className="support-faq">
            {FAQ.map((item) => (
              <div key={item.q} className="support-faq-item">
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2>Fair play</h2>
          <p>
            One account per person. No collusion or multi-accounting. We may void prizes and suspend
            accounts for abuse.
          </p>
        </section>
      </div>
    </main>
  );
}