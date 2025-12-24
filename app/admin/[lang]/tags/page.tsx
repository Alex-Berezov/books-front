import { TagList } from '@/components/admin/tags/TagList';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

interface TagsPageProps {
  params: {
    lang: SupportedLang;
  };
}

export const metadata: Metadata = {
  title: 'Tags Management',
  description: 'Manage tags in the admin panel',
};

/**
 * Tags management page (admin panel)
 */
export default function TagsPage(props: TagsPageProps) {
  const { params } = props;
  const { lang } = params;

  return (
    <div className="tags-page">
      <TagList lang={lang} />
    </div>
  );
}
