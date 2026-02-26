import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { SUPPORTED_LANGS, LANGUAGE_LABELS } from '@/lib/i18n/lang';

/**
 * Generate language selector options for Ant Design Select component
 * Shared utility to avoid duplication between LanguageSwitcher and AdminLanguageSwitcher
 * @returns Array of options with flags and labels
 */
export const getLanguageSelectOptions = () => {
  return SUPPORTED_LANGS.map((lang) => ({
    label: (
      <span>
        {FLAG_COMPONENTS[lang]} {LANGUAGE_LABELS[lang]}
      </span>
    ),
    value: lang,
  }));
};
