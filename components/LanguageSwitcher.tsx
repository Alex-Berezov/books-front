'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useBookOverview } from '@/api/hooks/usePublic';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import {
  getLangFromPath,
  switchLangInPath,
  SUPPORTED_LANGS,
  type SupportedLang,
} from '@/lib/i18n/lang';
import { getLanguageSelectOptions } from '@/lib/i18n/languageSelectOptions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { versionHasAnalysis } from '@/lib/seo/analysis-path';
import { versionHasSummary } from '@/lib/seo/summary-path';
import styles from './LanguageSwitcher.module.scss';

function PublicLanguageSelect({
  currentLang,
  onChange,
  options,
  ariaLabel,
}: {
  currentLang: string;
  onChange: (value: string) => void;
  options: { value: string }[];
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = SUPPORTED_LANGS.find((l) => l === currentLang);
  const displayLang = (selected || currentLang) as SupportedLang;

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
    }
    if (e.key === 'Enter' || e.key === ' ') {
      setOpen((v) => !v);
    }
  }, []);

  return (
    <div className={styles.publicSwitcher} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        {FLAG_COMPONENTS[displayLang]} {displayLang.toUpperCase()}
      </button>
      {open && (
        <ul className={styles.dropdown} role="listbox" aria-label={ariaLabel}>
          {options.map((opt) => {
            const lang = opt.value as SupportedLang;
            const isSelected = lang === currentLang;
            return (
              <li key={lang} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`${styles.dropdownItem} ${isSelected ? styles.selected : ''}`}
                  onClick={() => {
                    onChange(lang);
                    setOpen(false);
                  }}
                >
                  {FLAG_COMPONENTS[lang]} {lang.toUpperCase()}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export const LanguageSwitcher = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();

  const currentLang = getLangFromPath(pathname);

  const parts = pathname.split('/');
  const isBookRelated =
    parts.length > 3 && ['book', 'read', 'listen', 'summary'].includes(parts[2]);
  const bookSlug = isBookRelated ? parts[3] : null;

  const { data: book } = useBookOverview(currentLang, bookSlug as string, {
    enabled: !!bookSlug,
  });

  // Раздел пересказа `/summary/{n}` ведёт на `/summary` другого языка: каждый язык режет книгу
  // на разделы по-своему, пары «раздел ↔ раздел» нет (F04 `product.md` §5).
  const isSummarySectionPage = parts[2] === 'book' && parts[4] === 'summary' && Boolean(parts[5]);
  const switchParts = isSummarySectionPage ? parts.slice(0, 5) : parts;

  const handleLanguageChange = (newLang: string) => {
    const lang = newLang as SupportedLang;
    let newPath = switchLangInPath(switchParts.join('/'), lang);

    if (isBookRelated && book && book.versions) {
      const targetVersion = book.versions.find((v) => v.language === lang) as
        | ((typeof book.versions)[0] & { slug?: string })
        | undefined;
      if (targetVersion && targetVersion.slug) {
        const updatedParts = [...switchParts];
        updatedParts[1] = lang;
        updatedParts[3] = targetVersion.slug;
        newPath = updatedParts.join('/');
      }
    }

    router.push(newPath);
  };

  // Страницы пересказа `/{lang}/book/{slug}/summary` и анализа `/{lang}/book/{slug}/analysis`
  // есть только у языков с пересказом и анализом: другой язык отвечает 404. Правило то же, что
  // у hreflang страницы (`versionHasSummary`, `versionHasAnalysis`).
  const isSummaryPage = parts[2] === 'book' && parts[4] === 'summary';
  const isAnalysisPage = parts[2] === 'book' && parts[4] === 'analysis';
  const sectionFilter = isSummaryPage
    ? versionHasSummary
    : isAnalysisPage
      ? versionHasAnalysis
      : null;
  const availableLangs = new Set<string>();
  if (book && book.versions) {
    book.versions.forEach((v) => {
      if (v.language && (!sectionFilter || sectionFilter(v))) {
        availableLangs.add(v.language);
      }
    });
    // Счётчиков нет (неизвестно, у каких языков есть раздел) - только текущий язык, а не все.
    // На странице анализа текущий язык есть всегда: страница открыта, хотя счётчик её языка
    // может быть 0 (блок окончённой претензии по другой стране, решение арбитра `F03 | F03-2`).
    if ((sectionFilter && availableLangs.size === 0) || isAnalysisPage) {
      availableLangs.add(currentLang);
    }
  }

  const allOptions = getLanguageSelectOptions();
  const baseOptions =
    bookSlug && availableLangs.size > 0
      ? allOptions.filter((opt) => availableLangs.has(opt.value))
      : allOptions;

  const a11yLabel = t('a11y.selectLanguage');

  return (
    <PublicLanguageSelect
      currentLang={currentLang}
      onChange={(lang) => handleLanguageChange(lang)}
      options={baseOptions}
      ariaLabel={a11yLabel}
    />
  );
};
