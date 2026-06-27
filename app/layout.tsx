import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AppProviders } from '@/providers/AppProviders';
import '@/styles/globals.css';
import '@/styles/snackbar.scss';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bibliaris - Multilingual Audiobook Platform',
  description: 'Discover and enjoy audiobooks in multiple languages',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://api.bibliaris.com" crossOrigin="anonymous" />
      </head>
      <body>
        <AntdRegistry>
          <AppProviders>{children}</AppProviders>
        </AntdRegistry>
      </body>
    </html>
  );
}
