'use client';

import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const LazyConfigProvider = dynamic(
  () => import('@/providers/LazyConfigProvider').then((m) => m.LazyConfigProvider),
  { ssr: false }
);

export function AdminThemeProvider({ children }: { children: ReactNode }) {
  return <LazyConfigProvider>{children}</LazyConfigProvider>;
}
