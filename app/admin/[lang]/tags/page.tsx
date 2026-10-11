import { TagList } from '@/components/admin/tags/TagList';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

interface TagsPageProps {
  params: Promise<{
    lang: SupportedLang;
  }>;
}

export const metadata: Metadata = {
  title: 'Tags Management',
  description: 'Manage tags in the admin panel',
};

/**
 * Tags management page (admin panel)
 */
export default async function TagsPage(props: TagsPageProps) {
  const { params } = props;
  const { lang } = await params;

  return (
    <div className="tags-page">
      <TagList lang={lang} />
    </div>
  );
}
