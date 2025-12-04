'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select } from '@/components/common/Select';
import { getLangFromPath, switchLangInPath, type SupportedLang } from '@/lib/i18n/lang';
import { getLanguageSelectOptions } from '@/lib/i18n/languageSelectOptions';
import styles from '../LanguageSwitcher.module.scss';

/**
 * AdminLanguageSwitcher - Language switcher for admin panel
 * Handles /admin/:lang routes
 *
 * Note: In future iterations (per roadmap), this will include entity resolution
 * to navigate to the same entity in a different language when editing content.
 */
export const AdminLanguageSwitcher = () => {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current language from pathname using shared utility
  const currentLang = getLangFromPath(pathname);

  const handleLanguageChange = (newLang: string | string[]) => {
    // Safe to cast as Select options are typed with SupportedLang
    const lang = Array.isArray(newLang) ? newLang[0] : newLang;
    const newPath = switchLangInPath(pathname, lang as SupportedLang);
    router.push(newPath);

    // TODO (M3): When editing content with translations,
    // resolve the translation ID for the selected language
    // and redirect to /admin/:newLang/pages/:translationId or similar
  };

  return (
    <Select
      value={currentLang}
      onChange={handleLanguageChange}
      options={getLanguageSelectOptions()}
      className={styles.languageSwitcher}
      ariaLabel="Select admin language"
    />
  );
};
