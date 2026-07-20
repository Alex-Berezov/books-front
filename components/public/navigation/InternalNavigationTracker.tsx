'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const STORAGE_KEY_CURRENT = 'bibliaris.currentPath';
const STORAGE_KEY_PREVIOUS = 'bibliaris.previousPath';

export function InternalNavigationTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      const current = sessionStorage.getItem(STORAGE_KEY_CURRENT);
      if (current !== null && current !== fullPath) {
        sessionStorage.setItem(STORAGE_KEY_PREVIOUS, current);
      }
      sessionStorage.setItem(STORAGE_KEY_CURRENT, fullPath);
    } catch {
      // sessionStorage unavailable (incognito, SSR, etc.)
    }
  }, [fullPath]);

  return null;
}
