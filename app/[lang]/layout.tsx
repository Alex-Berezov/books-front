import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/public/layout/Footer';
import { Header } from '@/components/public/layout/Header';
import { InternalNavigationTracker } from '@/components/public/navigation/InternalNavigationTracker';
import { buildLangPath, httpGet } from '@/lib/http';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isSupportedLang, type SupportedLang } from '@/lib/i18n/lang';
import type { BookCardsResponse } from '@/types/api-schema';
import type { Metadata } from 'next';
import styles from '@/styles/layouts.module.scss';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export const dynamicParams = true;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;

  return {
    title: 'Bibliaris - Multilingual Audiobook Platform',
    description: 'Discover and enjoy audiobooks in multiple languages',
    openGraph: {
      title: 'Bibliaris - Multilingual Audiobook Platform',
      description: 'Discover and enjoy audiobooks in multiple languages',
      locale: lang,
      type: 'website',
    },
  };
}

export default async function PublicLayout({ children, params }: Props) {
  const { lang } = await params;

  // Validate language
  if (!isSupportedLang(lang)) {
    notFound();
  }

  const dict = getDictionary(lang as SupportedLang);
  const skipText = dict.a11y?.skipToContent || 'Skip to main content';

  const audioEndpoint = buildLangPath(lang, '/books/cards?page=1&limit=1&type=audio');
  const audioRes = await httpGet<BookCardsResponse>(audioEndpoint, {
    language: lang as SupportedLang,
    next: { revalidate: 300 },
  }).catch(() => null);
  const hasAudiobooks = (audioRes?.pagination?.total ?? 0) > 0;

  return (
    <div className={styles.publicLayout}>
      <a href="#main-content" className="skip-link">
        {skipText}
      </a>
      <Header />
      <Suspense fallback={null}>
        <InternalNavigationTracker />
      </Suspense>
      <main id="main-content" className={styles.publicMain}>
        {children}
      </main>
      <Footer hasAudiobooks={hasAudiobooks} />
    </div>
  );
}
