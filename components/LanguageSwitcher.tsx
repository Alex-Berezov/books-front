'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select } from 'antd';
import { getLangFromPath, switchLangInPath, type SupportedLang } from '@/lib/i18n/lang';
import { getLanguageSelectOptions } from '@/lib/i18n/languageSelectOptions';
import styles from './LanguageSwitcher.module.scss';

export const LanguageSwitcher = () => {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current language from pathname using shared utility
  const currentLang = getLangFromPath(pathname);

  const handleLanguageChange = (newLang: string) => {
    // Safe to cast as Select options are typed with SupportedLang
    const newPath = switchLangInPath(pathname, newLang as SupportedLang);
    router.push(newPath);
  };

  return (
    <Select
      value={currentLang}
      onChange={handleLanguageChange}
      options={getLanguageSelectOptions()}
      className={styles.languageSwitcher}
      aria-label="Select language"
    />
  );
};
