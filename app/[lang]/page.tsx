import { notFound } from 'next/navigation';
import { isSupportedLang, SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';

type Props = {
  params: Promise<{ lang: string }>;
};

// Generate static params for supported languages
export async function generateStaticParams() {
  return SUPPORTED_LANGS.map((lang) => ({
    lang,
  }));
}

export default async function PublicLangPage({ params }: Props) {
  const { lang } = await params;

  // Validate language
  if (!isSupportedLang(lang)) {
    notFound();
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Welcome to Bibliaris</h1>
      <p>Current language: {lang.toUpperCase()}</p>
      <p>This is a placeholder for the public homepage.</p>
    </div>
  );
}
