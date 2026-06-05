'use client';

import { Skeleton } from 'antd';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useBookSummary } from '@/api/hooks/useBookSummary';
import { useBookOverview } from '@/api/hooks/usePublic';
import { Button } from '@/components/common/Button';
import type { SupportedLang } from '@/lib/i18n/lang';
import styles from './summary.module.scss';

type Props = {
  params: { lang: string; bookSlug: string; versionId: string };
};

export default function BookSummaryPage({ params }: Props) {
  const { lang, bookSlug, versionId } = params;
  const supportedLang = lang as SupportedLang;
  const router = useRouter();

  // Fetch book overview for meta info (title, author, cover, etc.)
  const { data: book, isLoading: isBookLoading } = useBookOverview(supportedLang, bookSlug);

  // Fetch summary content
  const { data: summaryData, isLoading: isSummaryLoading } = useBookSummary(versionId);

  const isLoading = isBookLoading || isSummaryLoading;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Skeleton.Button active style={{ width: 120, height: 32 }} />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!book || !summaryData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Summary not found</h2>
        <p>We couldn&apos;t load the summary for this book version.</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Go Back
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
            onClick={() => router.back()}
            className={styles.backBtn}
          />
          <div className={styles.bookInfo}>
            <span className={styles.bookTitle}>{book.title}</span>
            <span className={styles.pageSubtitle}>Book Summary</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        <article className={styles.card}>
          <h1 className={styles.title}>{book.title} — Summary</h1>

          {summaryData.summary && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Key Takeaways</h2>
              <div
                className={styles.bodyText}
                dangerouslySetInnerHTML={{ __html: summaryData.summary }}
              />
            </section>
          )}

          {summaryData.analysis && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Analysis</h2>
              <div
                className={styles.bodyText}
                dangerouslySetInnerHTML={{ __html: summaryData.analysis }}
              />
            </section>
          )}

          {summaryData.themes && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Themes</h2>
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
