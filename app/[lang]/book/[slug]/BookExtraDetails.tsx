'use client';

import React from 'react';
import Link from 'next/link';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { BookOverview } from '@/types/api-schema';
import { BOOK_ANCHORS } from './bookAnchors';
import styles from './BookExtraDetails.module.scss';

/**
 * Ссылки «Разбор» на разделы анализа (F03-2, `product.md` §22): адрес раздела или `null`, когда
 * в анализе языка страницы такого блока нет - ссылка в никуда хуже отсутствующей.
 */
export interface AnalysisSectionLinks {
  characters: string | null;
  symbols: string | null;
  quotes: string | null;
}

interface BookExtraDetailsProps {
  activeVersion: BookOverview['versions'][0] | null;
  analysisLinks?: AnalysisSectionLinks | null;
}

export default function BookExtraDetails({ activeVersion, analysisLinks }: BookExtraDetailsProps) {
  const { t } = useTranslation();

  if (!activeVersion) return null;

  return (
    <>
      {/* Symbols Section. Якоря `symbols`, `characters`, `quotes` - цели ссылок «Узнать больше
          о книге» со страницы пересказа. */}
      {activeVersion.symbols && activeVersion.symbols.length > 0 && (
        <section id={BOOK_ANCHORS.symbols} className={styles.detailSection}>
          <h2 className={styles.detailTitle}>{t('book.symbols')}</h2>
          {analysisLinks?.symbols ? (
            <Link href={analysisLinks.symbols} className={styles.analysisLink}>
              {t('book.analysisBreakdown')}
            </Link>
          ) : null}
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
        <section id={BOOK_ANCHORS.characters} className={styles.detailSection}>
          <h2 className={styles.detailTitle}>{t('book.mainCharacters')}</h2>
          {analysisLinks?.characters ? (
            <Link href={analysisLinks.characters} className={styles.analysisLink}>
              {t('book.analysisBreakdown')}
            </Link>
          ) : null}
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
        <div id={BOOK_ANCHORS.quotes}>
          {/* «Разбор» - под заголовком, как у символов и персонажей (F03-3). */}
          <QuotesBlock
            items={activeVersion.quotes}
            title={t('book.quotes')}
            titleExtra={
              analysisLinks?.quotes ? (
                <Link href={analysisLinks.quotes} className={styles.analysisLink}>
                  {t('book.analysisBreakdown')}
                </Link>
              ) : null
            }
          />
        </div>
      )}

      {/* FAQ Section */}
      {activeVersion.faq && activeVersion.faq.length > 0 && (
        <FaqBlock items={activeVersion.faq} title={t('book.faqTitle')} />
      )}
    </>
  );
}
