import { BookListTable } from '@/components/admin/books/BookListTable';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';

interface BooksPageProps {
  params: {
    lang: SupportedLang;
  };
}

export const metadata: Metadata = {
  title: 'Books Management',
  description: 'Manage books in the admin panel',
};

/**
 * Books management page (admin panel)
 */
export default async function BooksPage(props: BooksPageProps) {
  const { params } = props;
  const { lang } = params;

  return (
    <div className="books-page">
      <BookListTable lang={lang} />
    </div>
  );
}
