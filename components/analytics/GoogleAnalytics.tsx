'use client';

import { usePathname } from 'next/navigation';
import Script from 'next/script';
import { useConsent } from '@/lib/consent/ConsentProvider';
import { isAnalyticsExcludedPath } from '@/lib/consent/ga-cookies';

type Props = {
  measurementId?: string;
};

export function GoogleAnalytics({ measurementId }: Props) {
  const pathname = usePathname();
  const { analyticsAllowed } = useConsent();

  if (!measurementId || !analyticsAllowed || isAnalyticsExcludedPath(pathname)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}');`}
      </Script>
    </>
  );
}
