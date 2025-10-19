'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select } from 'antd';
import { SUPPORTED_LANGS, type SupportedLang, switchLangInPath } from '@/lib/i18n/lang';

const LANGUAGE_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  pt: 'Português',
};

const LANGUAGE_FLAGS: Record<SupportedLang, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  pt: '🇵🇹',
};

/**
 * AdminLanguageSwitcher - Language switcher for admin panel
 * Handles /admin/:lang routes
 * 
 * Note: In future iterations (per roadmap), this will include entity resolution
 * to navigate to the same entity in a different language when editing content.
 */
export function AdminLanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current language from pathname (admin/:lang/...)
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentLang = pathSegments[0] === 'admin' && pathSegments.length >= 2 
    ? (pathSegments[1] as SupportedLang)
    : 'en';

  const handleLanguageChange = (newLang: SupportedLang) => {
    const newPath = switchLangInPath(pathname, newLang);
    router.push(newPath);
    
    // TODO (M3): When editing content with translations,
    // resolve the translation ID for the selected language
    // and redirect to /admin/:newLang/pages/:translationId or similar
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
      aria-label="Select admin language"
    />
  );
}
