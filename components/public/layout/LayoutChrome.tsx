'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isImmersiveRoute } from '@/lib/utils/immersive-routes';

type Props = {
  children: ReactNode;
};

/**
 * Renders the public chrome (Header/Footer) everywhere except immersive routes
 * such as the reader, which owns the whole viewport and its own bars.
 */
export function LayoutChrome({ children }: Props) {
  const pathname = usePathname();

  if (isImmersiveRoute(pathname)) {
    return null;
  }

  return <>{children}</>;
}
