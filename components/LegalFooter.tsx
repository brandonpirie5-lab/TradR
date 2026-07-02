'use client';

import React from 'react';
import Link from 'next/link';

export default function LegalFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`legal-footer ${className}`.trim()}>
      <Link href="/terms" className="legal-footer-link">
        Terms
      </Link>
      <span className="legal-footer-sep" aria-hidden>
        ·
      </span>
      <Link href="/privacy" className="legal-footer-link">
        Privacy
      </Link>
      <span className="legal-footer-sep" aria-hidden>
        ·
      </span>
      <Link href="/support" className="legal-footer-link">
        Support
      </Link>
    </footer>
  );
}