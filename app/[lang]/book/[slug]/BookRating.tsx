'use client';

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { rateBook } from '@/api/endpoints/rating';
import { useUserBookRating, bookKeys } from '@/api/hooks/useBooks';
import { StarRating } from '@/components/public/books/StarRating';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/lib/utils/toast';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './book.module.scss';

interface BookRatingProps {
  bookId: string;
  slug: string;
  lang: string;
}

export default function BookRating({ bookId, slug, lang }: BookRatingProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { status } = useSession();
  const queryClient = useQueryClient();

  const { data: userRatingData } = useUserBookRating(bookId, {
    enabled: !!bookId && status === 'authenticated',
  });

  const [userRating, setUserRating] = useState<number>(0);
  const [isRatingPending, setIsRatingPending] = useState(false);

  useEffect(() => {
    if (userRatingData?.score !== undefined && userRatingData?.score !== null) {
      setUserRating(userRatingData.score);
    }
  }, [userRatingData]);

  const handleRateBook = async (score: number) => {
    if (status !== 'authenticated') {
      router.push(`/${lang}/auth/sign-in?callbackUrl=/${lang}/book/${slug}`);
      return;
    }
    setIsRatingPending(true);
    try {
      await rateBook(bookId, score);
      setUserRating(score);
      toast.success(t('book.ratingSuccess'));
      await queryClient.invalidateQueries({
        queryKey: queryKeys.bookOverview(lang as SupportedLang, slug),
      });
      await queryClient.invalidateQueries({
        queryKey: bookKeys.userRating(bookId),
      });
    } catch (err) {
      toast.error(t('book.ratingError'));
      console.error(err);
    } finally {
      setIsRatingPending(false);
    }
  };

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <div className={styles.myRatingRow}>
      <span className={styles.myRatingLabel}>{t('book.rateBook')}</span>
      <StarRating
        rating={userRating}
        size="md"
        showCount={false}
        interactive
        disabled={isRatingPending}
        onRate={handleRateBook}
      />
    </div>
  );
}
