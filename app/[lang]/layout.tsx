import { notFound } from 'next/navigation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { isSupportedLang } from '@/lib/i18n/lang';
import { AppProviders } from '@/providers/AppProviders';
import type { Metadata } from 'next';
import '@/styles/globals.css';
import styles from '@/styles/layouts.module.scss';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

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

  return (
    <html lang={lang}>
      <body>
        <AppProviders>
          <div className={styles.publicLayout}>
            <header className={styles.publicHeader}>
              <h1>Bibliaris</h1>
              <LanguageSwitcher />
            </header>

            <main className={styles.publicMain}>{children}</main>

            <footer className={styles.publicFooter}>
              <p>© 2025 Bibliaris. All rights reserved.</p>
            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
