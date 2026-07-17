'use client';

import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useBookOverview } from '@/api/hooks/usePublic';
import { FLAG_COMPONENTS } from '@/lib/i18n/FlagIcon';
import { getLangFromPath, switchLangInPath, type SupportedLang } from '@/lib/i18n/lang';
import { getLanguageSelectOptions } from '@/lib/i18n/languageSelectOptions';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SelectOption } from '@/components/common/Select/Select.types';
import styles from './AdminLanguageSwitcher.module.scss';

const AdminSelect = dynamic(() => import('@/components/common/Select').then((m) => m.Select));

export const AdminLanguageSwitcher = () => {
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

  const handleLanguageChange = (newLang: string | string[]) => {
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

  const a11yLabel = t('a11y.selectLanguage');

  const options: SelectOption[] = baseOptions.map((opt) => {
    const labelNode = (
      <span>
        {FLAG_COMPONENTS[opt.value as SupportedLang] || null} {(opt.value as string).toUpperCase()}
      </span>
    );
    return {
      ...opt,
      label: labelNode,
      shortLabel: labelNode,
    };
  });

  return (
    <AdminSelect
      value={currentLang}
      onChange={handleLanguageChange}
      options={options}
      className={`${styles.languageSwitcher} ${styles.admin}`}
      popupClassName={styles.languageSwitcherPopup}
      ariaLabel={a11yLabel}
      optionLabelProp="shortLabel"
    />
  );
};
