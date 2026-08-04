'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './SignInLoading.module.scss';

export const SignInLoading = () => {
  const { t } = useTranslation();

  return <div className={styles.loading}>{t('common.loading')}</div>;
};
