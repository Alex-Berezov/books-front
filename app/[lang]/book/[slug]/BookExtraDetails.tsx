'use client';

import React from 'react';
import type { BookOverview } from '@/types/api-schema';
import styles from './BookExtraDetails.module.scss';

interface BookExtraDetailsProps {
  activeVersion: BookOverview['versions'][0] | null;
  supportedLang: string;
}

export default function BookExtraDetails({ activeVersion, supportedLang }: BookExtraDetailsProps) {
  if (!activeVersion) return null;

  return (
    <>
      {/* Symbols Section */}
      {activeVersion.symbols && activeVersion.symbols.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailTitle}>{supportedLang === 'ru' ? 'Символы' : 'Symbols'}</h2>
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
          <h2 className={styles.detailTitle}>
            {supportedLang === 'ru' ? 'Персонажи' : 'Main Characters'}
          </h2>
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
        <section className={styles.detailSection}>
          <h2 className={styles.detailTitle}>{supportedLang === 'ru' ? 'Цитаты' : 'Quotes'}</h2>
          <div className={styles.quotesList}>
            {activeVersion.quotes.map((quote, idx) => (
              <blockquote key={idx} className={styles.quoteCard}>
                <p className={styles.quoteText}>“{quote.text}”</p>
                {quote.author && <cite className={styles.quoteAuthor}>— {quote.author}</cite>}
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {activeVersion.faq && activeVersion.faq.length > 0 && (
        <section className={styles.detailSection} style={{ marginBottom: '2rem' }}>
          <h2 className={styles.detailTitle}>
            {supportedLang === 'ru' ? 'Часто задаваемые вопросы' : 'Frequently Asked Questions'}
          </h2>
          <div className={styles.faqList}>
            {activeVersion.faq.map((item, idx) => (
              <details key={idx} className={styles.faqDetails}>
                <summary className={styles.faqSummary}>{item.question}</summary>
                <div className={styles.faqAnswer}>{item.answer}</div>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
