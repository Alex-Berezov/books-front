'use client';

import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import { BookOpen, Headphones, FileText, Bookmark, BookmarkX, Check } from 'lucide-react';
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
  const [isBookshelfFocused, setIsBookshelfFocused] = useState(false);
  // Optimistic override of the saved state; null means "trust the server".
  const [optimisticSaved, setOptimisticSaved] = useState<boolean | null>(null);

  const { data: bookshelfData } = useBookshelf(1, 100, {
    enabled: status === 'authenticated',
  });
  const addToBookshelfMutation = useAddToBookshelf();
  const removeFromBookshelfMutation = useRemoveFromBookshelf();

  const serverInBookshelf = !!bookshelfData?.items?.some(
    (item) => item.bookVersion.bookId === bookId || item.bookVersion.id === versionId
  );
  const inBookshelf = optimisticSaved ?? serverInBookshelf;

  // Drop the override only once the refetched shelf agrees with it, so the
  // button never flashes the previous state between mutation and invalidation.
  useEffect(() => {
    if (optimisticSaved !== null && optimisticSaved === serverInBookshelf) {
      setOptimisticSaved(null);
    }
  }, [optimisticSaved, serverInBookshelf]);

  const isPending = addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending;

  // In the saved state, hover/focus previews the destructive action so the user
  // can tell that clicking again unsaves the book.
  const showRemoveHint = inBookshelf && isBookshelfFocused;

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
      setOptimisticSaved(false);
      removeFromBookshelfMutation.mutate(idToRemove, {
        onError: () => {
          setOptimisticSaved(null);
          message.error(t('bookshelf.removeFail'));
        },
      });
    } else {
      setOptimisticSaved(true);
      addToBookshelfMutation.mutate(versionId, {
        onError: () => {
          setOptimisticSaved(null);
          message.error(t('bookshelf.addFail'));
        },
      });
    }
  };

  const bookshelfLabel = (() => {
    if (showRemoveHint) return t('book.removeFromBookshelf');
    return inBookshelf ? t('book.inYourBookshelf') : t('book.addToBookshelf');
  })();

  const bookshelfIcon = (() => {
    if (isPending) return <span className={styles.spinner} aria-hidden="true" />;
    if (showRemoveHint) return <BookmarkX size={18} aria-hidden="true" />;
    return inBookshelf ? (
      <Check size={18} aria-hidden="true" />
    ) : (
      <Bookmark size={18} aria-hidden="true" />
    );
  })();

  return (
    <div className={styles.actions}>
      {textVersion && (
        <Link
          href={`/${lang}/book/${slug}/read`}
          className={`${styles.ctaBase} ${styles.ctaPrimary}`}
        >
          <BookOpen size={18} aria-hidden="true" />
          {textVersion.isFree ? t('book.readFree') : t('book.read')}
        </Link>
      )}

      {audioVersion && (
        <Link
          href={`/${lang}/book/${slug}/listen`}
          className={`${styles.ctaBase} ${styles.ctaSecondary}`}
        >
          <Headphones size={18} aria-hidden="true" />
          {t('book.listen')}
        </Link>
      )}

      {hasSummary && versionId && (
        <Link
          href={`/${lang}/book/${slug}#summary`}
          className={`${styles.ctaBase} ${styles.ctaTertiary}`}
        >
          <FileText size={18} aria-hidden="true" />
          {t('book.summary')}
        </Link>
      )}

      <button
        type="button"
        className={`${styles.ctaBase} ${styles.ctaTertiary} ${
          inBookshelf ? styles.ctaTertiarySaved : ''
        }`}
        onClick={handleBookshelfToggle}
        onMouseEnter={() => setIsBookshelfFocused(true)}
        onMouseLeave={() => setIsBookshelfFocused(false)}
        onFocus={() => setIsBookshelfFocused(true)}
        onBlur={() => setIsBookshelfFocused(false)}
        disabled={isPending}
        aria-pressed={inBookshelf}
        aria-busy={isPending}
      >
        {bookshelfIcon}
        <span className={styles.labelStack}>
          <span className={`${styles.labelSlot} ${styles.labelGhost}`} aria-hidden="true">
            {t('book.addToBookshelf')}
          </span>
          <span className={`${styles.labelSlot} ${styles.labelGhost}`} aria-hidden="true">
            {t('book.inYourBookshelf')}
          </span>
          <span className={`${styles.labelSlot} ${styles.labelGhost}`} aria-hidden="true">
            {t('book.removeFromBookshelf')}
          </span>
          <span className={styles.labelSlot}>{bookshelfLabel}</span>
        </span>
      </button>
    </div>
  );
}
