'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './AuthConsentLine.module.scss';

const PLACEHOLDER = /(\{terms\}|\{privacy\})/;

/**
 * Строка под кнопками создания аккаунта (`product.md` §12, F01-6): ссылки на условия и политику
 * в той же вкладке, без галочки и без записи в базу. Стоит и под Google на странице входа:
 * вход через Google создаёт аккаунт новому адресу (решение арбитра 14.10.2026), поэтому ключи
 * `auth.register.consent*` общие для обеих страниц.
 */
export const AuthConsentLine: FC = () => {
  const { t, lang } = useTranslation();

  return (
    <p className={styles.consentLine}>
      {t('auth.register.consentLine')
        .split(PLACEHOLDER)
        .map((part, index) => {
          if (part === '{terms}') {
            return (
              <Link key={index} href={`/${lang}/terms`}>
                {t('auth.register.consentTermsLink')}
              </Link>
            );
          }
          if (part === '{privacy}') {
            return (
              <Link key={index} href={`/${lang}/privacy`}>
                {t('auth.register.consentPrivacyLink')}
              </Link>
            );
          }
          return part;
        })}
    </p>
  );
};
