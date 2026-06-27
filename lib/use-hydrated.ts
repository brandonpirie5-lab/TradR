'use client';

import { useEffect, useState } from 'react';

/** True only after the component has mounted in the browser (avoids SSR/client clock mismatches). */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}