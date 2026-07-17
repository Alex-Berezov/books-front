'use client';

import React from 'react';
import { BookOpen, Headphones, FileText, Bookmark, BookmarkCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBookshelf, useAddToBookshelf, useRemoveFromBookshelf } from '@/api/hooks/useBookshelf';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { VersionPreview } from '@/types/api-schema/books';
import styles from './book.module.scss';

interface BookActionsProps {
  slug: string;
  lang: string;
  bookId: string;
  versionId: string | undefined;
  textVersion: VersionPreview | null;
  audioVersion: VersionPreview | null;
  hasSummary: boolean;
}

export default function BookActions({
  slug,
  lang,
  bookId,
  versionId,
  textVersion,
  audioVersion,
  hasSummary,
}: BookActionsProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { status } = useSession();

  const { data: bookshelfData } = useBookshelf(1, 100, {
    enabled: status === 'authenticated',
  });
  const addToBookshelfMutation = useAddToBookshelf();
  const removeFromBookshelfMutation = useRemoveFromBookshelf();

  const inBookshelf = !!bookshelfData?.items?.some(
    (item) => item.bookVersion.bookId === bookId || item.bookVersion.id === versionId
  );

  const isPending = addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending;

  const handleBookshelfToggle = () => {
    if (status !== 'authenticated') {
      router.push(`/${lang}/auth/sign-in?callbackUrl=/${lang}/book/${slug}`);
      return;
    }

    if (!versionId) return;

    if (inBookshelf) {
      const existingItem = bookshelfData?.items?.find(
        (item) => item.bookVersion.bookId === bookId || item.bookVersion.id === versionId
      );
      const idToRemove = existingItem?.bookVersion.id || versionId;
      removeFromBookshelfMutation.mutate(idToRemove);
    } else {
      addToBookshelfMutation.mutate(versionId);
    }
  };

  return (
    <div className={styles.actions}>
      {textVersion && (
        <Link href={`/${lang}/book/${slug}/read`} className={styles.actionLink}>
          <BookOpen size={18} /> {textVersion.isFree ? t('book.readFree') : t('book.read')}
        </Link>
      )}

      {audioVersion && (
        <Link href={`/${lang}/book/${slug}/listen`} className={styles.actionLink}>
          <Headphones size={18} /> {t('book.listen')}
        </Link>
      )}

      {hasSummary && versionId && (
        <Link href={`/${lang}/book/${slug}#summary`} className={styles.actionLink}>
          <FileText size={18} /> {t('book.summary')}
        </Link>
      )}

      <button
        type="button"
        className={`${styles.actionLink} ${inBookshelf ? styles.actionLinkActive : ''}`}
        onClick={handleBookshelfToggle}
        disabled={isPending}
      >
        {isPending ? (
          <span className={styles.spinner} />
        ) : inBookshelf ? (
          <BookmarkCheck size={18} />
        ) : (
          <Bookmark size={18} />
        )}
        {inBookshelf ? t('book.inBookshelf') : t('book.addToBookshelf')}
      </button>
    </div>
  );
}
