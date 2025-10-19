import { notFound } from 'next/navigation';
import { isSupportedLang } from '@/lib/i18n/lang';
import { AppProviders } from '@/providers/AppProviders';
import { AdminLanguageSwitcher } from '@/components/admin/AdminLanguageSwitcher';
import '@/styles/globals.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function AdminLayout({ children, params }: Props) {
  const { lang } = await params;

  if (!isSupportedLang(lang)) {
    notFound();
  }

  return (
    <html lang={lang}>
      <body>
        <AppProviders>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar placeholder */}
            <aside
              style={{
                width: '250px',
                background: '#001529',
                color: 'white',
                padding: '1rem',
                boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
              }}
            >
              <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>Admin Panel</h2>
              <nav>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li style={{ padding: '0.5rem 0' }}>📊 Dashboard</li>
                  <li style={{ padding: '0.5rem 0' }}>📄 Pages</li>
                  <li style={{ padding: '0.5rem 0' }}>📚 Books</li>
                  <li style={{ padding: '0.5rem 0' }}>🏷️ Categories</li>
                  <li style={{ padding: '0.5rem 0' }}>🔖 Tags</li>
                </ul>
              </nav>
            </aside>

            {/* Main content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Admin header */}
              <header
                style={{
                  background: '#fff',
                  padding: '1rem 2rem',
                  borderBottom: '1px solid #d9d9d9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Content Management</h1>
                <AdminLanguageSwitcher />
              </header>

              {/* Content */}
              <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
