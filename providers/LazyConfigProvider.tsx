'use client';

import { type ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import { colors } from '@/styles/tokens';

/**
 * Lazy antd ConfigProvider wrapper.
 *
 * Loaded via dynamic(ssr:false) in AppProviders so antd's theme + rc-components
 * are parsed/evaluated AFTER initial hydration, not on the critical main-thread
 * path that produces Total Blocking Time.
 *
 * antd components render in SSR HTML with default theme; the custom theme
 * (colorPrimary, borderRadius) applies once this wrapper hydrates on the client.
 */
export function LazyConfigProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: colors.primary,
          borderRadius: 4,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
