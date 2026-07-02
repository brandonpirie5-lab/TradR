'use client';

import React from 'react';

type State = { hasError: boolean; message?: string };

export default class PitErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    void fetch('/api/ops/client-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        component: info.componentStack?.slice(0, 1000),
      }),
    }).catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="pit-error-fallback">
        <p className="pit-error-kicker">Tape glitch</p>
        <h2 className="pit-error-title">Something slipped</h2>
        <p className="pit-error-copy">Refresh the pit — your wallet and tickets are safe on the server.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload TradR Pit
        </button>
      </div>
    );
  }
}