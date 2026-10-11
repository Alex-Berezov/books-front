'use client';

import { type ReactNode } from 'react';
// antd 5 на React 19: статические `message`/`Modal.confirm` рендерятся через этот патч
// (`LEGACY-448`, `T121`). Импорт до первого использования antd — здесь, в корне админки.
import '@ant-design/v5-patch-for-react-19';
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
