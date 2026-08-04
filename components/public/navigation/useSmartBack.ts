'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const STORAGE_KEY_PREVIOUS = 'bibliaris.previousPath';

/**
 * Returns a "go back" callback that prefers the previously visited internal
 * route (tracked by `InternalNavigationTracker`), falls back to the browser
 * history and, when the page was opened directly, navigates to `fallbackHref`.
 */
export function useSmartBack(fallbackHref: string): () => void {
  const router = useRouter();
  const pathname = usePathname();
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY_PREVIOUS);
      if (stored && stored !== pathname) {
        setPreviousPath(stored);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [pathname]);

  return useCallback(() => {
    if (previousPath) {
      router.push(previousPath);
      return;
    }
    try {
      if (window.history.length > 1) {
        router.back();
        return;
      }
    } catch {
      // history unavailable
    }
    router.push(fallbackHref);
  }, [previousPath, fallbackHref, router]);
}
