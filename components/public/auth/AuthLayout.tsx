'use client';

import type { FC } from 'react';
import { CircleCheck } from 'lucide-react';
import { BookOutlinedIcon } from '@/components/common/icons/BookOutlinedIcon';
import { PageBackButton } from '@/components/public/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { AuthLayoutProps } from './AuthLayout.types';
import styles from './AuthLayout.module.scss';

/**
 * Каркас страниц входа и регистрации (`LEGACY-442`): панель марки с перечнем
 * возможностей слева, справа — колонка формы с кнопкой «назад» и шапкой марки
 * для узкого экрана. Сама форма приходит `children`.
 */
export const AuthLayout: FC<AuthLayoutProps> = ({ lang, children }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.container}>
      {/* Left Sidebar - Brand Identity */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.brand}>
            <BookOutlinedIcon className={styles.logoIcon} />
            <span className={styles.brandName}>BIBLIARIS</span>
          </div>
          <p className={styles.tagline}>{t('auth.sidebar.tagline')}</p>
          <div className={styles.featuresList}>
            {[
              t('auth.sidebar.feat1'),
              t('auth.sidebar.feat2'),
              t('auth.sidebar.feat3'),
              t('auth.sidebar.feat4'),
            ].map((feat) => (
              <div key={feat} className={styles.featureItem}>
                <CircleCheck className={styles.checkIcon} size="1em" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          <PageBackButton lang={lang} />

          {/* Mobile Header */}
          <div className={styles.mobileHeader}>
            <BookOutlinedIcon className={styles.logoIcon} />
            <span className={styles.brandName}>BIBLIARIS</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
