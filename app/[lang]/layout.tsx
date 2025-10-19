import { notFound } from 'next/navigation';
import { isSupportedLang } from '@/lib/i18n/lang';
import { AppProviders } from '@/providers/AppProviders';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import '@/styles/globals.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

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
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header placeholder */}
            <header
              style={{
                background: '#001529',
                color: 'white',
                padding: '1rem 2rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Bibliaris</h1>
              <LanguageSwitcher />
            </header>

            {/* Main content */}
            <main style={{ flex: 1 }}>{children}</main>

            {/* Footer placeholder */}
            <footer
              style={{
                background: '#f0f0f0',
                padding: '1rem 2rem',
                textAlign: 'center',
                borderTop: '1px solid #d9d9d9',
              }}
            >
              <p>© 2025 Bibliaris. All rights reserved.</p>
            </footer>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
