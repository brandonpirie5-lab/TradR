const ONBOARDING_PREFIX = 'tradr_pit_onboarded_';
export const ARENA_TAB_HINT_KEY = 'tradr_arena_tab_hint_shown';

export function onboardingKey(userId: string) {
  return `${ONBOARDING_PREFIX}${userId}`;
}

export function hasCompletedOnboarding(userId: string | undefined) {
  if (!userId || typeof window === 'undefined') return false;
  return !!localStorage.getItem(onboardingKey(userId));
}

export function markOnboardingComplete(userId: string | undefined) {
  if (!userId || typeof window === 'undefined') return;
  localStorage.setItem(onboardingKey(userId), '1');
  localStorage.setItem(ARENA_TAB_HINT_KEY, '1');
}