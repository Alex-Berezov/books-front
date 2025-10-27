import { SUPPORTED_LANGS, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '@/lib/i18n/lang';

/**
 * Generate language selector options for Ant Design Select component
 * Shared utility to avoid duplication between LanguageSwitcher and AdminLanguageSwitcher
 * @returns Array of options with flags and labels
 */
export const getLanguageSelectOptions = () => {
  return SUPPORTED_LANGS.map((lang) => ({
    label: (
      <span>
        {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
      </span>
    ),
    value: lang,
  }));
};
