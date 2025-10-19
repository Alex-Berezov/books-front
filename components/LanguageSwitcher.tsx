'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select } from 'antd';
import {
  SUPPORTED_LANGS,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
  type SupportedLang,
  switchLangInPath,
} from '@/lib/i18n/lang';

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current language from pathname
  const currentLang = pathname.split('/').filter(Boolean)[0] as SupportedLang;

  const handleLanguageChange = (newLang: SupportedLang) => {
    const newPath = switchLangInPath(pathname, newLang);
    router.push(newPath);
  };

  const options = SUPPORTED_LANGS.map((lang) => ({
    label: (
      <span>
        {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
      </span>
    ),
    value: lang,
  }));

  return (
    <Select
      value={currentLang}
      onChange={handleLanguageChange}
      options={options}
      style={{ minWidth: 150 }}
      aria-label="Select language"
    />
  );
}
