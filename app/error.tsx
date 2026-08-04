'use client';

import { useEffect } from 'react';
import { PageBackButton } from '@/components/public/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './error.module.scss';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t, lang } = useTranslation();

  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className={styles.errorContainer}>
      <PageBackButton lang={lang} />

      <h1>{t('errorPage.title')}</h1>
      <p>{t('errorPage.description')}</p>
      <button type="button" onClick={() => reset()} className={styles.retryButton}>
        {t('common.retry')}
      </button>
    </div>
  );
}
