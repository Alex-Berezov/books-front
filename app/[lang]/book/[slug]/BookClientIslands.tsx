'use client';

// Клиентские острова страницы книги. `dynamic(..., { ssr: false })` next 15 в серверном
// компоненте не принимает (сборка падает), поэтому вызовы живут здесь, а `page.tsx` только
// рисует их (`LEGACY-448`, `T121`). Поведение прежнее: на сервере острова не рендерились
// и на next 14 (`BailoutToCSR` в `next/dist/shared/lib/lazy-dynamic/loadable.js`).

import dynamic from 'next/dynamic';
import { SkeletonBlock } from '@/components/common/Skeleton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './book.module.scss';

/**
 * Заглушка отзывов. Язык — из адреса через `useTranslation` (`usePathname`), а не из
 * `window.location`: заглушка рендерится и на сервере, где `window` нет, и прежний разбор
 * давал там язык по умолчанию, а на клиенте — язык адреса (рассинхрон гидратации).
 */
export const ReviewsLoading = () => {
  const { dict } = useTranslation();
  return <div className={styles.reviewsLoading}>{dict.book.loadingReviews}</div>;
};

export const BookReviews = dynamic(() => import('@/components/public/reviews/BookReviews'), {
  ssr: false,
  loading: ReviewsLoading,
});

export const BookExtraDetails = dynamic(() => import('./BookExtraDetails'), {
  ssr: false,
});

export const BookActions = dynamic(() => import('./BookActions'), {
  ssr: false,
  loading: () => <SkeletonBlock className={styles.actionsSkeleton} />,
});

export const BookRating = dynamic(() => import('./BookRating'), {
  ssr: false,
});
