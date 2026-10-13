import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { ConsentProvider } from '@/lib/consent/ConsentProvider';
import { GA_MEASUREMENT_ID } from '@/lib/consent/ga-cookies';
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
        <ConsentProvider>
          <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
          <AppProviders>{children}</AppProviders>
        </ConsentProvider>
      </body>
    </html>
  );
}
