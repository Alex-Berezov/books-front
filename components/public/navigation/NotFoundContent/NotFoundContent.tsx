'use client';

import Link from 'next/link';
import { PageBackButton } from '@/components/public/navigation/PageBackButton';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './NotFoundContent.module.scss';

export const NotFoundContent = () => {
  const { t, lang } = useTranslation();

  return (
    <div className={styles.container}>
      <PageBackButton lang={lang} />

      <div className={styles.code}>404</div>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.subtitle}>{t('notFound.subtitle')}</p>
      <div className={styles.actions}>
        <Link href={`/${lang}`} className={styles.primaryBtn}>
          {t('notFound.backHome')}
        </Link>
        <Link href={`/${lang}/catalog`} className={styles.secondaryBtn}>
          {t('notFound.browseCatalog')}
        </Link>
      </div>
    </div>
  );
};
