'use client';

import { getDictionary } from '@/lib/i18n/dictionaries';
import { getDefaultLang, isSupportedLang } from '@/lib/i18n/lang';
import styles from './PageBackButton.module.scss';
import { SmartBackButton } from './SmartBackButton';

export interface PageBackButtonProps {
  /** Current route language; unsupported values fall back to the default language. */
  lang: string;
  /** Where to go when the page was opened directly. Defaults to the language home page. */
  fallbackHref?: string;
  className?: string;
}

/**
 * Ready-to-use "Back" control for public pages: localized label plus the
 * default page-level styling. Wraps `SmartBackButton`.
 */
export function PageBackButton({ lang, fallbackHref, className }: PageBackButtonProps) {
  const safeLang = isSupportedLang(lang) ? lang : getDefaultLang();
  const dict = getDictionary(safeLang);

  return (
    <SmartBackButton
      label={dict.common.back}
      fallbackHref={fallbackHref ?? `/${safeLang}`}
      className={`${styles.pageBack} ${className ?? ''}`}
    />
  );
}
