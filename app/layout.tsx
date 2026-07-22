import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
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
        <link rel="preconnect" href="https://media.bibliaris.com" crossOrigin="anonymous" />
      </head>
      <body>
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
