'use client';

import React from 'react';
import type { TapeLeaderboardEntry } from '../lib/game-types';

export default function TapeWeekLeaderboard({
  entries,
  themeLine,
  loading,
}: {
  entries: TapeLeaderboardEntry[];
  themeLine: string;
  loading?: boolean;
}) {
  if (loading) {
    return <div className="text-center py-12 text-muted">Loading tape rankings…</div>;
  }

  if (!entries.length) {
    return (
      <div className="text-center py-12 text-muted border border-dashed border-card rounded-2xl">
        No settled pits this week yet.
        <br />
        Ring in — the tape resets Monday ET.
      </div>
    );
  }

  return (
    <div>
      <div className="tape-week-head mb-4 p-3 rounded-xl border border-accent/20 bg-accent/5">
        <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-accent mb-1">
          This week on the tape
        </div>
        <div className="text-xs text-muted leading-snug">{themeLine}</div>
        <div className="text-[10px] text-muted mt-2">
          Score = prizes + podium bonus + battles fought
        </div>
      </div>

      <div className="space-y-1">
        {entries.map((entry) => (
          <div
            key={entry.userId}
            className={`vault-global-row vault-row flex items-center justify-between py-3.5 px-2 rounded-lg ${
              entry.isYou ? 'bg-user-card ring-1 ring-accent/20' : ''
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`font-mono text-lg w-7 shrink-0 ${
                  entry.rank <= 3 ? 'text-accent' : 'text-muted'
                }`}
              >
                #{entry.rank}
              </div>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  entry.isYou ? 'bg-accent text-black' : 'bg-zinc-800'
                }`}
              >
                {entry.username.replace('@', '').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">
                  {entry.username}{' '}
                  {entry.isYou && <span className="text-accent text-[10px]">(YOU)</span>}
                </div>
                <div className="text-[10px] text-muted">
                  {entry.battles} pits · {entry.wins} wins · ${entry.winnings.toLocaleString()} won
                </div>
              </div>
            </div>
            <div className="text-right shrink-0 pl-2">
              <div className="font-mono text-accent font-bold">{entry.tapeScore}</div>
              <div className="text-[9px] text-muted uppercase tracking-wide">tape pts</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}