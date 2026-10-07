import type { SupportedLang } from '@/lib/i18n/lang';
import { BookVersionPreviewClient } from './BookVersionPreviewClient';
import { PREVIEW_SOURCE_EDITOR, PREVIEW_SOURCE_PARAM } from './preview.constants';

interface BookVersionPreviewPageProps {
  params: {
    lang: SupportedLang;
    id: string;
  };
  searchParams: Partial<Record<typeof PREVIEW_SOURCE_PARAM, string>>;
}

/**
 * Draft preview of a book version's text, opened from the version edit page.
 * Access is the admin panel's: `middleware.ts` and `app/admin/[lang]/layout.tsx`.
 */
export default function BookVersionPreviewPage({
  params,
  searchParams,
}: BookVersionPreviewPageProps) {
  return (
    <BookVersionPreviewClient
      lang={params.lang}
      versionId={params.id}
      openedFromEditor={searchParams[PREVIEW_SOURCE_PARAM] === PREVIEW_SOURCE_EDITOR}
    />
  );
}
