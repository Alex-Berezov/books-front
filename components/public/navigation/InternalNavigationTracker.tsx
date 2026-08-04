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
    try {
      // First render after a full page load: seed the current path and drop the
      // previous one, otherwise a stale entry from an earlier visit would be
      // treated as "where the user came from".
      if (isFirstRender.current) {
        isFirstRender.current = false;
        sessionStorage.setItem(STORAGE_KEY_CURRENT, fullPath);
        sessionStorage.removeItem(STORAGE_KEY_PREVIOUS);
        return;
      }

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
