'use client';

import { useMemo, useState } from 'react';
import type { FC } from 'react';
import { useRouter } from 'next/navigation';
import { useBookVersion, useChapters } from '@/api/hooks';
import { Spinner } from '@/components/admin/shared';
import { Button } from '@/components/common/Button';
import { ReaderView, useImmersiveBody } from '@/components/common/ReaderView';
import { describeApiFailure, isApiError } from '@/lib/errors';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './BookVersionPreviewClient.module.scss';

interface BookVersionPreviewClientProps {
  lang: SupportedLang;
  versionId: string;
  /** Opened by the edit page's Preview button in its own tab (`?from=editor`). */
  openedFromEditor: boolean;
}

/** Chapter on screen: by id, so a chapter added or removed before it does not swap the text. */
interface ChapterPosition {
  id: string | null;
  /** Where it was, for when it is deleted in the editor while the preview is open. */
  index: number;
}

/**
 * Both queries refetch when the tab gets focus again: the preview sits in its own
 * tab next to the editor, and a fix, a rename or a publish made there must show up
 * here on switching back. The app-wide client turns focus refetch off.
 */
const LIVE_QUERY = { staleTime: 0, refetchOnWindowFocus: true } as const;

const loadErrorMessage = (error: unknown): string =>
  isApiError(error)
    ? describeApiFailure(error.statusCode, error.error)
    : 'Failed to load the book for preview. Try again later.';

/**
 * Draft preview of a book version's text.
 *
 * Shows the chapters through the same `ReaderView` the public reader uses, so
 * formatting and images look exactly as readers will see them - but before the
 * version is published. Chapters come from the admin route, which answers for
 * any status; the public one returns 404 for a draft. Nothing is written: no
 * reading progress, no position restore. The admin shell is not rendered on
 * this route (`isAdminImmersiveRoute`), so the reader gets the whole viewport.
 */
export const BookVersionPreviewClient: FC<BookVersionPreviewClientProps> = (props) => {
  const { lang, versionId, openedFromEditor } = props;
  const router = useRouter();
  const { t } = useTranslation();

  const [position, setPosition] = useState<ChapterPosition>({ id: null, index: 0 });

  const versionQuery = useBookVersion(versionId, LIVE_QUERY);
  const chaptersQuery = useChapters(versionId, LIVE_QUERY);

  const chapters = useMemo(() => chaptersQuery.data?.items ?? [], [chaptersQuery.data]);
  const foundIndex = position.id ? chapters.findIndex((c) => c.id === position.id) : -1;
  const currentChapterIndex =
    foundIndex !== -1 ? foundIndex : Math.min(position.index, Math.max(chapters.length - 1, 0));
  const shownChapterId = chapters[currentChapterIndex]?.id ?? null;

  // The position always names the chapter on screen and where it stands now. Kept in
  // step during render, not in an effect: the first chapter gets anchored before any
  // click, an insertion before it is followed by the index, and after the chapter on
  // screen is deleted the neighbour that took its place becomes the anchor.
  if (
    shownChapterId &&
    (shownChapterId !== position.id || currentChapterIndex !== position.index)
  ) {
    setPosition({ id: shownChapterId, index: currentChapterIndex });
  }

  // A refetch failure keeps what is already on screen: React Query holds the previous
  // data next to the error, and throwing the admin out of the text they are checking
  // for a dropped focus refetch would be worse than slightly stale text.
  const loadError =
    (chaptersQuery.error && !chaptersQuery.data && chaptersQuery.error) ||
    (versionQuery.error && !versionQuery.data && versionQuery.error);
  // Data, not `isLoading`: a query paused offline is neither loading nor failed, and
  // the reader would tell the admin the book has no chapters.
  const hasLoaded = versionQuery.data !== undefined && chaptersQuery.data !== undefined;

  useImmersiveBody(hasLoaded);

  const goToChapter = (index: number) => {
    setPosition({ id: chapters[index]?.id ?? null, index });
  };

  const backToEditor = () => {
    // Opened by the edit page in a new tab, with that editor still open in the first
    // one: going back means closing this tab, not loading a second editor of the same
    // version whose save would overwrite the first. The browser may refuse to close a
    // tab that has history of its own; then, as for a preview reached by a pasted
    // link, the editor opens here.
    if (openedFromEditor) {
      window.close();
      if (window.closed) return;
    }
    router.push(`/admin/${lang}/books/versions/${versionId}`);
  };

  if (loadError) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorMessage}>{loadErrorMessage(loadError)}</p>
        <Button variant="secondary" onClick={backToEditor}>
          Back to Edit Version
        </Button>
      </div>
    );
  }

  if (!hasLoaded) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
      </div>
    );
  }

  const isDraft = versionQuery.data?.status !== 'published';

  return (
    <ReaderView
      title={versionQuery.data?.title}
      chapters={chapters}
      currentChapterIndex={currentChapterIndex}
      onChapterChange={goToChapter}
      onBack={backToEditor}
      notice={
        isDraft ? (
          <div className={styles.draftNotice} role="status">
            {t('reader.draftPreview')}
          </div>
        ) : undefined
      }
    />
  );
};
