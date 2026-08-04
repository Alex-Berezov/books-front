'use client';

import React from 'react';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { BookOverview } from '@/types/api-schema';
import styles from './BookExtraDetails.module.scss';

interface BookExtraDetailsProps {
  activeVersion: BookOverview['versions'][0] | null;
}

export default function BookExtraDetails({ activeVersion }: BookExtraDetailsProps) {
  const { t } = useTranslation();

  if (!activeVersion) return null;

  return (
    <>
      {/* Symbols Section */}
      {activeVersion.symbols && activeVersion.symbols.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailTitle}>{t('book.symbols')}</h2>
          <div className={styles.symbolsGrid}>
            {activeVersion.symbols.map((symbol) => (
              <div key={symbol.title} className={styles.symbolCard}>
                <div className={styles.symbolTitle}>{symbol.title}</div>
                <div className={styles.symbolDesc}>{symbol.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Characters Section */}
      {activeVersion.characters && activeVersion.characters.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailTitle}>{t('book.mainCharacters')}</h2>
          <div className={styles.charactersGrid}>
            {activeVersion.characters.map((char) => (
              <div key={char.name} className={styles.characterCard}>
                <div className={styles.charName}>{char.name}</div>
                <div className={styles.charDesc}>{char.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quotes Section */}
      {activeVersion.quotes && activeVersion.quotes.length > 0 && (
        <QuotesBlock items={activeVersion.quotes} title={t('book.quotes')} />
      )}

      {/* FAQ Section */}
      {activeVersion.faq && activeVersion.faq.length > 0 && (
        <FaqBlock items={activeVersion.faq} title={t('book.faqTitle')} />
      )}
    </>
  );
}
