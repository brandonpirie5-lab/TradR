'use client';

import SpotlightTour, { TourHelpButton, type SpotlightTourStep } from './SpotlightTour';

const TOUR_KEY = 'tradr_active_battles_tour_v2';

const STEPS: SpotlightTourStep[] = [
  {
    id: 'tabs',
    title: 'Active / Upcoming / Done',
    body: 'Three tabs for your contest life. Active = pits you\'re in now. Upcoming = open arenas. Done = results + recap.',
    target: 'tabs',
    padding: 6,
  },
  {
    id: 'overview',
    title: 'Contest overview & rank',
    body: 'Each card shows live portfolio value, P&L vs $100k start, and your rank in that pit.',
    target: 'overview',
    fallbackTarget: 'tabs',
    padding: 10,
  },
  {
    id: 'info',
    title: 'Contest intel (i)',
    body: 'Tap this for start/end times, prize breakdown, full asset list, max trades, and rules.',
    target: 'contest-info',
    fallbackTarget: 'overview',
    padding: 10,
  },
  {
    id: 'money-zone',
    title: 'Cash zone bar',
    body: 'Your #1 read on every battle. Green = getting paid. Yellow = on the bubble. Shows who to pass and how much you need.',
    target: 'money-zone',
    fallbackTarget: 'overview',
    padding: 8,
  },
  {
    id: 'stats',
    title: 'Stats row',
    body: 'Quick read on portfolio vs $100k start. Cash and open positions listed below.',
    target: 'stats',
    fallbackTarget: 'overview',
    padding: 6,
  },
  {
    id: 'trade',
    title: 'Trade button',
    body: 'Hit TRADE to open your ticket — preview rank impact before you confirm.',
    target: 'trade',
    fallbackTarget: 'overview',
    padding: 8,
  },
];

export function shouldShowActiveBattlesTour(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(TOUR_KEY);
}

export { TourHelpButton };

export default function ActiveBattlesTour({
  onClose,
  stepIndex,
  onStepChange,
}: {
  onClose: () => void;
  stepIndex: number;
  onStepChange: (n: number) => void;
}) {
  return (
    <SpotlightTour
      steps={STEPS}
      stepIndex={stepIndex}
      onStepChange={onStepChange}
      onClose={onClose}
      onFinish={() => localStorage.setItem(TOUR_KEY, '1')}
      label="Battles guide"
    />
  );
}