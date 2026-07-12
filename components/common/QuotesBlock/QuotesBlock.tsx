'use client';

import type { FC, ReactNode } from 'react';
import styles from './QuotesBlock.module.scss';

export interface QuoteItem {
  text: string;
  source?: string;
  author?: string;
}

export interface QuotesBlockProps {
  items: QuoteItem[];
  title?: string;
  className?: string;
  icon?: ReactNode;
}

export const QuotesBlock: FC<QuotesBlockProps> = ({
  items,
  title = 'Quotes',
  className = '',
  icon,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section className={`${styles.quotesBlock} ${className}`.trim()}>
      <h2 className={styles.title}>
        {icon && <span className={styles.icon}>{icon}</span>}
        {title}
      </h2>
      <div className={styles.grid}>
        {items.map((item, index) => (
          <blockquote key={index} className={styles.card}>
            <p className={styles.text}>&ldquo;{item.text}&rdquo;</p>
            {(item.source || item.author) && (
              <cite className={styles.source}>— {item.source || item.author}</cite>
            )}
          </blockquote>
        ))}
      </div>
    </section>
  );
};
