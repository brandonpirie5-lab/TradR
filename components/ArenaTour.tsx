'use client';

import SpotlightTour, { TourHelpButton, type SpotlightTourStep } from './SpotlightTour';

const TOUR_KEY = 'tradr_arena_tour_v1';

const STEPS: SpotlightTourStep[] = [
  {
    id: 'stage',
    title: 'Main event',
    body: 'Today\'s headline pit — start time, tape, and prize at a glance. Tap Enter when you\'re ready.',
    target: 'arena-hero',
    padding: 14,
  },
  {
    id: 'switch',
    title: 'More pits',
    body: 'Every pit on today\'s schedule — time, assets, entry. Tap a row to ring in or open your ticket.',
    target: 'open-arenas',
    fallbackTarget: 'arena-hero',
    padding: 10,
  },
  {
    id: 'info',
    title: 'Contest details',
    body: 'Full rules, asset list, trade limits, and schedule — everything before you commit.',
    target: 'contest-info',
    fallbackTarget: 'arena-hero',
    padding: 10,
  },
];

export function shouldShowArenaTour(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(TOUR_KEY);
}

export { TourHelpButton };

export default function ArenaTour({
  stepIndex,
  onStepChange,
  onClose,
}: {
  stepIndex: number;
  onStepChange: (n: number) => void;
  onClose: () => void;
}) {
  return (
    <SpotlightTour
      steps={STEPS}
      stepIndex={stepIndex}
      onStepChange={onStepChange}
      onClose={onClose}
      onFinish={() => localStorage.setItem(TOUR_KEY, '1')}
      label="Arena guide"
    />
  );
}