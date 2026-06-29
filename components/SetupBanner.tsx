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
      <p className="text-[10px] text-red-100/70 mb-2">
        <span className="font-mono">.env.local</span> is local only — Vercel does <strong>not</strong> auto-update from git.
        After fixing keys, restart <span className="font-mono">npm run dev</span> locally or redeploy on Vercel.
      </p>
      <ol className="text-[11px] text-red-100/80 list-decimal list-inside space-y-1 mb-3">
        <li>Supabase dashboard → Settings → API Keys</li>
        <li>
          <span className="font-mono">sb_publishable_…</span> →{' '}
          <span className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</span>
        </li>
        <li>
          <span className="font-mono">sb_secret_…</span> → <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span>{' '}
          (never the publishable key)
        </li>
        <li>Same URL + keys in Vercel env vars for production, then redeploy</li>
      </ol>
      <button onClick={check} className="text-xs px-3 py-1 border border-red-700 text-red-300 rounded-lg hover:bg-red-900/30">
        Re-check connection
      </button>
    </div>
  );
}