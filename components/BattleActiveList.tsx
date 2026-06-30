'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Contest, LeaderboardEntry, Participation } from '../lib/game-types';
import type { TradeLimitInfo } from '../lib/trade-limits';
import BattleActiveStrip from './BattleActiveStrip';
import BattleActiveTicket from './BattleActiveTicket';

type BattleActiveListProps = {
  battles: Participation[];
  contests: Contest[];
  bellTick: number;
  prices: Record<string, number>;
  tradeLimitByContest: Record<number, TradeLimitInfo | null | undefined>;
  getPortfolioValue: (p: Participation) => number;
  rankInContest: (contestId: number) => number | null;
  getContestBoard: (contestId: number) => LeaderboardEntry[];
  onTrade: (contestId: number) => void;
  onLeaderboard: (contestId: number) => void;
  onInfo: (contestId: number) => void;
};

function battleTicketProps(
  p: Participation,
  contests: Contest[],
  getPortfolioValue: (p: Participation) => number
) {
  const contest = contests.find((c) => c.id === p.contestId)!;
  const liveValue = getPortfolioValue(p);
  const pnlPct = ((liveValue / p.startingValue) - 1) * 100;
  return { contest, liveValue, pnlPct };
}

function pickDefaultLead(
  battles: Participation[],
  rankInContest: (contestId: number) => number | null
): number {
  const sorted = [...battles].sort((a, b) => {
    const ra = rankInContest(a.contestId) ?? 9999;
    const rb = rankInContest(b.contestId) ?? 9999;
    if (ra !== rb) return ra - rb;
    return a.contestId - b.contestId;
  });
  return sorted[0]?.contestId ?? battles[0].contestId;
}

export default function BattleActiveList({
  battles,
  contests,
  bellTick,
  prices,
  tradeLimitByContest,
  getPortfolioValue,
  rankInContest,
  getContestBoard,
  onTrade,
  onLeaderboard,
  onInfo,
}: BattleActiveListProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [leadContestId, setLeadContestId] = useState<number | null>(null);

  const battleIdsKey = useMemo(
    () =>
      battles
        .map((b) => b.contestId)
        .sort((a, b) => a - b)
        .join(','),
    [battles]
  );

  const stableBattles = useMemo(
    () => [...battles].sort((a, b) => a.contestId - b.contestId),
    [battleIdsKey, battles]
  );

  useEffect(() => {
    if (stableBattles.length === 0) {
      setLeadContestId(null);
      setExpandedId(null);
      return;
    }
    setLeadContestId((current) => {
      if (current != null && stableBattles.some((b) => b.contestId === current)) {
        return current;
      }
      return pickDefaultLead(stableBattles, rankInContest);
    });
    // Only re-pick lead when the set of active pits changes — not on price/rank ticks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleIdsKey]);

  const lead =
    stableBattles.find((b) => b.contestId === leadContestId) ?? stableBattles[0] ?? null;
  const others = stableBattles.filter((b) => b.contestId !== lead?.contestId);

  const focusPit = (contestId: number) => {
    setLeadContestId(contestId);
    setExpandedId(null);
  };

  if (!lead) return null;

  const leadProps = battleTicketProps(lead, contests, getPortfolioValue);

  return (
    <div className="bt-active-stack">
      <BattleActiveTicket
        key={lead.contestId}
        contest={leadProps.contest}
        participation={lead}
        liveValue={leadProps.liveValue}
        pnlPct={leadProps.pnlPct}
        rank={rankInContest(lead.contestId)}
        board={getContestBoard(lead.contestId)}
        prices={prices}
        bellTick={bellTick}
        tradeLimit={tradeLimitByContest[lead.contestId]}
        hero
        onTrade={() => {
          focusPit(lead.contestId);
          onTrade(lead.contestId);
        }}
        onLeaderboard={() => onLeaderboard(lead.contestId)}
        onInfo={() => onInfo(lead.contestId)}
      />

      {others.length > 0 && (
        <div className="bt-other-pits">
          <p className="bt-section-label">
            {others.length} other pit{others.length === 1 ? '' : 's'}
          </p>
          <div className="bt-strip-list">
            {others.map((p) => {
              const { contest, liveValue, pnlPct } = battleTicketProps(
                p,
                contests,
                getPortfolioValue
              );
              const expanded = expandedId === p.contestId;

              return (
                <div key={p.contestId} className="bt-strip-stack">
                  <BattleActiveStrip
                    contest={contest}
                    liveValue={liveValue}
                    pnlPct={pnlPct}
                    rank={rankInContest(p.contestId)}
                    board={getContestBoard(p.contestId)}
                    expanded={expanded}
                    onToggle={() => {
                      focusPit(p.contestId);
                      setExpandedId((id) => (id === p.contestId ? null : p.contestId));
                    }}
                    onTrade={() => {
                      focusPit(p.contestId);
                      onTrade(p.contestId);
                    }}
                  />
                  {expanded && (
                    <BattleActiveTicket
                      contest={contest}
                      participation={p}
                      liveValue={liveValue}
                      pnlPct={pnlPct}
                      rank={rankInContest(p.contestId)}
                      board={getContestBoard(p.contestId)}
                      prices={prices}
                      bellTick={bellTick}
                      tradeLimit={tradeLimitByContest[p.contestId]}
                      onTrade={() => {
                        focusPit(p.contestId);
                        onTrade(p.contestId);
                      }}
                      onLeaderboard={() => onLeaderboard(p.contestId)}
                      onInfo={() => onInfo(p.contestId)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}