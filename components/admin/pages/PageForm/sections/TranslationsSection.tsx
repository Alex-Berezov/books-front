'use client';

import type { FC } from 'react';
import Link from 'next/link';
import { Button } from '@/components/common/Button';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import type { PageTranslation } from '@/types/api-schema';
import styles from '../PageForm.module.scss';

export interface TranslationsSectionProps {
  currentLang: SupportedLang;
  translations?: PageTranslation[];
  translationGroupId?: string | null;
}

export const TranslationsSection: FC<TranslationsSectionProps> = ({
  currentLang,
  translations = [],
  translationGroupId,
}) => {
  if (!translationGroupId) {
    return (
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Translations</h3>
        <div className={styles.translationRow}>
          <span className={styles.editingText}>
            Translations are not available for this page yet. Try saving the page to initialize the
            translation group.
          </span>
        </div>
      </div>
    );
  }

  const getTranslation = (lang: SupportedLang) => {
    return translations.find((t) => t.language === lang);
  };

  return (
    <div className={styles.section}>
      <h3 className={styles.sectionTitle}>Translations</h3>
      <div className={styles.translationList}>
        {SUPPORTED_LANGS.map((lang) => {
          const translation = getTranslation(lang);
          const isCurrent = lang === currentLang;

          return (
            <div key={lang} className={styles.translationRow}>
              <div className={styles.translationInfo}>
                <span className={styles.langBadge}>{lang}</span>
                {isCurrent && <span className={styles.currentBadge}>Current</span>}
                {translation && (
                  <span className={styles.translationTitle}>{translation.title}</span>
                )}
              </div>

              <div>
                {isCurrent ? (
                  <span className={styles.editingText}>Editing</span>
                ) : translation ? (
                  <Link href={`/admin/${lang}/pages/${translation.id}`}>
                    <Button variant="secondary" size="sm">
                      Edit
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/admin/${lang}/pages/new?translationGroupId=${translationGroupId}`}>
                    <Button variant="secondary" size="sm">
                      Create
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
