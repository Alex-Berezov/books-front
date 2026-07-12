'use client';

import type { FC, ReactNode } from 'react';
import styles from './FaqBlock.module.scss';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqBlockProps {
  items: FaqItem[];
  title?: string;
  showJsonLd?: boolean;
  className?: string;
  icon?: ReactNode;
}

export const FaqBlock: FC<FaqBlockProps> = ({
  items,
  title = 'FAQ',
  showJsonLd = true,
  className = '',
  icon,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section className={`${styles.faqBlock} ${className}`.trim()}>
      {showJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: items.map((item) => ({
                '@type': 'Question',
                name: item.question,
                acceptedAnswer: { '@type': 'Answer', text: item.answer },
              })),
            }),
          }}
        />
      )}
      <h2 className={styles.title}>
        {icon && <span className={styles.icon}>{icon}</span>}
        {title}
      </h2>
      <div className={styles.items}>
        {items.map((item, index) => (
          <details key={index} className={styles.item}>
            <summary className={styles.question}>{item.question}</summary>
            <div className={styles.answer}>{item.answer}</div>
          </details>
        ))}
      </div>
    </section>
  );
};
