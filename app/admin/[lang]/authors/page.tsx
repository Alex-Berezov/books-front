import { AuthorList } from '@/components/admin/authors';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

interface AuthorsPageProps {
  params: Promise<{
    lang: SupportedLang;
  }>;
}

export const metadata: Metadata = {
  title: 'Authors Management',
  description: 'Manage authors in the admin panel',
};

export default async function AuthorsPage(props: AuthorsPageProps) {
  const { params } = props;
  const { lang } = await params;

  return (
    <div className="authors-page">
      <AuthorList lang={lang} />
    </div>
  );
}
