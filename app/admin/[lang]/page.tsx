import { notFound } from 'next/navigation';
import { isSupportedLang, SUPPORTED_LANGS } from '@/lib/i18n/lang';

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({
    lang,
  }));
}

export default async function AdminDashboardPage({ params }: Props) {
  const { lang } = await params;

  if (!isSupportedLang(lang)) {
    notFound();
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin Dashboard</h1>
      <p>Language: {lang.toUpperCase()}</p>
      <p>This is a placeholder for the admin panel.</p>
      <p>Protected route - will be secured in M1.</p>
    </div>
  );
}
