'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';

const STORAGE_KEY_PREVIOUS = 'bibliaris.previousPath';

export interface SmartBackButtonProps {
  label: string;
  fallbackHref: string;
  className?: string;
}

export function SmartBackButton({ label, fallbackHref, className }: SmartBackButtonProps) {
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

  const handleClick = useCallback(() => {
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

  return (
    <button type="button" onClick={handleClick} className={className}>
      <ChevronLeft size={16} aria-hidden="true" /> {label}
    </button>
  );
}
