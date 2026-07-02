'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch('/api/ops/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        digest: error.digest,
      }),
    });
  }, [error]);

  return (
    <div className="pit-error-fallback min-h-screen">
      <p className="pit-error-kicker">Tape glitch</p>
      <h2 className="pit-error-title">Page hit a snag</h2>
      <p className="pit-error-copy">{error.message || 'Unknown error'}</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
        <button type="button" className="btn border border-card py-3 rounded-xl" onClick={() => (window.location.href = '/')}>
          Back to Arena
        </button>
      </div>
    </div>
  );
}