'use client';

import { Skeleton } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useBookSummary } from '@/api/hooks/useBookSummary';
import { useBookOverview } from '@/api/hooks/usePublic';
import { Button } from '@/components/common/Button';
import { useSmartBack } from '@/components/public/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { isNotFoundError } from '@/lib/utils/content-failure';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { BookOverview } from '@/types/api-schema';
import styles from './summary.module.scss';

type Props = {
  params: { lang: string; bookSlug: string; versionId: string };
  // Серверный `page.tsx` уже разрешил эту книгу и убедился, что `versionId`
  // принадлежит ей, — иначе отдал бы честный 404 (LEGACY-084). Здесь тот же
  // ответ уезжает в `initialData`: второй запрос той же книги не нужен, и
  // скелет книги не мигает.
  initialBook?: BookOverview;
};

export default function SummaryClient({ params, initialBook }: Props) {
  const { lang, bookSlug, versionId } = params;
  const supportedLang = lang as SupportedLang;
  const { t } = useTranslation();
  const goBack = useSmartBack(`/${lang}/book/${bookSlug}`);

  // Fetch book overview for meta info (title, author, cover, etc.)
  // `initialDataUpdatedAt: 0` — по той же причине, что и в плеере: снимок
  // приезжает со страницы под ISR и свежим считаться не должен.
  const { data: book, isLoading: isBookLoading } = useBookOverview(supportedLang, bookSlug, {
    initialData: initialBook,
    initialDataUpdatedAt: 0,
  });

  // Fetch summary content
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    error: summaryError,
  } = useBookSummary(versionId);

  const isLoading = isBookLoading || isSummaryLoading;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton.Button active style={{ width: 120, height: 32 }} />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  // 🔴 Отказ запроса — не «саммари нет» (LEGACY-084, та же граница, что развели
  // читалка и плеер). Книга и версия уже подтверждены сервером, поэтому отказ на
  // `/versions/{id}/summary` означает «не удалось выяснить»: 429 или 500. Слитые
  // в один экран, эти два случая отправляли читателя восвояси с уверенным
  // «саммари не написано», и он не возвращался.
  //
  // 🔴 Но 404 — это ответ, а не отказ: версию сняли с публикации, и `book.versions`
  // из обзора мог протухнуть (у него свой `revalidate`). Ждать тут нечего, и
  // «попробуйте позже» было бы той же путаницей, только вывернутой наизнанку.
  //
  // 🔴 Сравнение именно с `undefined`: `null` — успешный ответ «саммари не
  // написано». При `!summaryData` неудачный фоновый перезапрос (включён
  // `refetchOnReconnect`) подменял бы верный экран «саммари пока нет» на отказ.
  if (summaryError && summaryData === undefined && !isNotFoundError(summaryError)) {
    return (
      <div className={styles.errorContainer}>
        <h2>{t('book.summaryLoadError')}</h2>
        <p>{t('book.summaryLoadErrorText')}</p>
        <Button variant="secondary" onClick={goBack}>
          {t('player.goBack')}
        </Button>
      </div>
    );
  }

  if (!book || !summaryData) {
    return (
      <div className={styles.errorContainer}>
        <h2>{t('book.summaryNotFound')}</h2>
        <p>{t('book.summaryNotFoundText')}</p>
        <Button variant="secondary" onClick={goBack}>
          {t('player.goBack')}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.summaryPage}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            variant="ghost"
            shape="circle"
            leftIcon={<ArrowLeft size={18} />}
            onClick={goBack}
            className={styles.backBtn}
          />
          <div className={styles.bookInfo}>
            <span className={styles.bookTitle}>{book.title}</span>
            <span className={styles.pageSubtitle}>{t('book.summaryPageSubtitle')}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <article className={styles.card}>
          <h1 className={styles.title}>
            {book.title} — {t('book.summaryHeading')}
          </h1>

          {summaryData.summary && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('book.keyTakeaways')}</h2>
              <div
                className={styles.bodyText}
                dangerouslySetInnerHTML={{ __html: summaryData.summary }}
              />
            </section>
          )}

          {summaryData.analysis && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('book.analysis')}</h2>
              <div
                className={styles.bodyText}
                dangerouslySetInnerHTML={{ __html: summaryData.analysis }}
              />
            </section>
          )}

          {summaryData.themes && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{t('book.themesSection')}</h2>
              <div
                className={styles.bodyText}
                dangerouslySetInnerHTML={{ __html: summaryData.themes }}
              />
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
