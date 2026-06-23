'use client';

import React from 'react';
import { BookOpen, Headphones, FileText, Bookmark, BookmarkCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useBookshelf, useAddToBookshelf, useRemoveFromBookshelf } from '@/api/hooks/useBookshelf';
import { Button } from '@/components/common/Button';
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
        <Link href={`/${lang}/book/${slug}/read`} passHref legacyBehavior>
          <Button variant="secondary" size="lg" leftIcon={<BookOpen size={18} />}>
            {textVersion.isFree ? t('book.readFree') : t('book.read')}
          </Button>
        </Link>
      )}

      {audioVersion && (
        <Link href={`/${lang}/book/${slug}/listen`} passHref legacyBehavior>
          <Button variant="secondary" size="lg" leftIcon={<Headphones size={18} />}>
            {t('book.listen')}
          </Button>
        </Link>
      )}

      {hasSummary && versionId && (
        <Link href={`/${lang}/book/${slug}#summary`} passHref legacyBehavior>
          <Button variant="secondary" size="lg" leftIcon={<FileText size={18} />}>
            {t('book.summary')}
          </Button>
        </Link>
      )}

      <Button
        variant="secondary"
        size="lg"
        active={inBookshelf}
        loading={addToBookshelfMutation.isPending || removeFromBookshelfMutation.isPending}
        leftIcon={inBookshelf ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        onClick={handleBookshelfToggle}
      >
        {inBookshelf ? t('book.inBookshelf') : t('book.addToBookshelf')}
      </Button>
    </div>
  );
}
