'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useBookOverview } from '@/api/hooks/usePublic';
import { Select } from '@/components/common/Select';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { getLangFromPath, switchLangInPath, type SupportedLang } from '@/lib/i18n/lang';
import { getLanguageSelectOptions } from '@/lib/i18n/languageSelectOptions';
import styles from './LanguageSwitcher.module.scss';

interface LanguageSwitcherProps {
  variant?: 'public' | 'admin';
}

export const LanguageSwitcher = ({ variant = 'public' }: LanguageSwitcherProps) => {
  const pathname = usePathname();
  const router = useRouter();

  // Extract current language from pathname using shared utility
  const currentLang = getLangFromPath(pathname);

  // Parse path to see if we are on a book-related page
  const parts = pathname.split('/');
  const isBookRelated =
    parts.length > 3 && ['book', 'read', 'listen', 'summary'].includes(parts[2]);
  const bookSlug = isBookRelated ? parts[3] : null;

  // Fetch book overview to get available languages of versions, only if on a book-related page
  const { data: book } = useBookOverview(currentLang, bookSlug as string, {
    enabled: !!bookSlug,
  });

  const handleLanguageChange = (newLang: string | string[]) => {
    // Safe to cast as Select options are typed with SupportedLang
    const lang = (Array.isArray(newLang) ? newLang[0] : newLang) as SupportedLang;
    let newPath = switchLangInPath(pathname, lang);

    if (isBookRelated && book && book.versions) {
      const targetVersion = book.versions.find((v) => v.language === lang) as
        | ((typeof book.versions)[0] & { slug?: string })
        | undefined;
      if (targetVersion && targetVersion.slug) {
        const updatedParts = [...parts];
        updatedParts[1] = lang;
        updatedParts[3] = targetVersion.slug;
        newPath = updatedParts.join('/');
      }
    }

    router.push(newPath);
  };

  // Determine available languages for the select options
  const availableLangs = new Set<string>();
  if (book && book.versions) {
    book.versions.forEach((v) => {
      if (v.language) {
        availableLangs.add(v.language);
      }
    });
  }

  const allOptions = getLanguageSelectOptions();
  const baseOptions =
    bookSlug && availableLangs.size > 0
      ? allOptions.filter((opt) => availableLangs.has(opt.value))
      : allOptions;

  const options = baseOptions.map((opt) => ({
    ...opt,
    shortLabel: (
      <span>
        {FLAG_COMPONENTS[opt.value as SupportedLang] || null} {(opt.value as string).toUpperCase()}
      </span>
    ),
  }));

  return (
    <Select
      value={currentLang}
      onChange={handleLanguageChange}
      options={options}
      className={`${styles.languageSwitcher} ${variant === 'admin' ? styles.admin : ''}`}
      popupClassName={styles.languageSwitcherPopup}
      ariaLabel="Select language"
      optionLabelProp="shortLabel"
    />
  );
};
