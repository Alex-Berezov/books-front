import { ConfigProvider } from 'antd';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/public/layout/Footer';
import { Header } from '@/components/public/layout/Header';
import { isSupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import styles from '@/styles/layouts.module.scss';
import { colors } from '@/styles/tokens';

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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: colors.publicPrimary,
          borderRadius: 8,
        },
      }}
    >
      <div className={styles.publicLayout}>
        <Header />
        <main className={styles.publicMain}>{children}</main>
        <Footer />
      </div>
    </ConfigProvider>
  );
}
