import type { SupportedLang } from '@/lib/i18n/lang';
import { BookVersionPreviewClient } from './BookVersionPreviewClient';
import { PREVIEW_SOURCE_EDITOR, PREVIEW_SOURCE_PARAM } from './preview.constants';

interface BookVersionPreviewPageProps {
  params: Promise<{
    lang: SupportedLang;
    id: string;
  }>;
  searchParams: Promise<Partial<Record<typeof PREVIEW_SOURCE_PARAM, string>>>;
}

/**
 * Draft preview of a book version's text, opened from the version edit page.
 * Access is the admin panel's: `middleware.ts` and `app/admin/[lang]/layout.tsx`.
 */
export default async function BookVersionPreviewPage({
  params,
  searchParams,
}: BookVersionPreviewPageProps) {
  const { lang, id } = await params;
  const query = await searchParams;
  return (
    <BookVersionPreviewClient
      lang={lang}
      versionId={id}
      openedFromEditor={query[PREVIEW_SOURCE_PARAM] === PREVIEW_SOURCE_EDITOR}
    />
  );
}
