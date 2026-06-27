'use client';

import React, { useEffect, useState } from 'react';

type Health = {
  ok: boolean;
  error?: string;
  hint?: string;
  projectUrl?: string;
  checks?: Record<string, string>;
};

export default function SetupBanner() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  const check = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      setHealth(await res.json());
    } catch {
      setHealth({ ok: false, error: 'Could not reach /api/health' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  if (loading || health?.ok) return null;

  return (
    <div className="mx-5 mt-3 mb-1 rounded-2xl border border-red-900/60 bg-red-950/40 p-4 text-sm">
      <div className="font-bold text-red-300 mb-1">Supabase not connected — multiplayer blocked</div>
      <p className="text-red-200/90 text-xs leading-relaxed mb-2">
        {health?.hint || health?.error || 'Backend health check failed.'}
      </p>
      {health?.projectUrl && (
        <p className="text-[10px] text-muted font-mono mb-2 break-all">
          Current URL: {health.projectUrl}
        </p>
      )}
      <ol className="text-[11px] text-red-100/80 list-decimal list-inside space-y-1 mb-3">
        <li>Open <span className="text-accent">supabase.com/dashboard</span> → your project</li>
        <li>Settings → API → copy <strong>Project URL</strong> + keys</li>
        <li>Paste into <span className="font-mono">.env.local</span> (local) or <span className="font-mono">Vercel → Environment Variables</span> (production) — then <strong>Redeploy</strong></li>
        <li>Run <span className="font-mono">supabase-schema.sql</span> in SQL Editor</li>
      </ol>
      <button onClick={check} className="text-xs px-3 py-1 border border-red-700 text-red-300 rounded-lg hover:bg-red-900/30">
        Re-check connection
      </button>
    </div>
  );
}