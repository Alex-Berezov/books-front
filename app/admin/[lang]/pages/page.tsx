import { PageListTable } from '@/components/admin/pages/PageListTable';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

interface PagesPageProps {
  params: {
    lang: SupportedLang;
  };
}

export const metadata: Metadata = {
  title: 'Pages Management',
  description: 'Manage CMS pages in the admin panel',
};

/**
 * CMS pages management page (admin panel)
 */
export default async function PagesPage(props: PagesPageProps) {
  const { params } = props;
  const { lang } = params;

  return (
    <div className="pages-page">
      <PageListTable lang={lang} />
    </div>
  );
}
