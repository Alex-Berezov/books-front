import type { FC, ReactNode } from 'react';
import Link from 'next/link';
import styles from './QuotesBlock.module.scss';

export interface QuoteItem {
  text: string;
  source?: string;
  author?: string;
  /** Адрес источника на сайте (книга цитаты, F02-3): подпись становится ссылкой. */
  sourceHref?: string;
  /** Толкование под цитатой (анализ книги, F03-2): абзацы простого текста. */
  comment?: string[];
  /** Дополнение под цитатой (метки тем анализа, F03-2). */
  extra?: ReactNode;
}

export interface QuotesBlockProps {
  items: QuoteItem[];
  title?: string;
  className?: string;
  icon?: ReactNode;
  /** `id` секции - якорь для ссылок на блок (раздел «Ключевые цитаты» анализа, F03-2). */
  id?: string;
}

export const QuotesBlock: FC<QuotesBlockProps> = ({
  items,
  title = 'Quotes',
  className = '',
  icon,
  id,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section id={id} className={`${styles.quotesBlock} ${className}`.trim()}>
      <h2 className={styles.title}>
        {icon && <span className={styles.icon}>{icon}</span>}
        {title}
      </h2>
      <div className={styles.grid}>
        {items.map((item, index) => (
          <blockquote key={index} className={styles.card}>
            <p className={styles.text}>&ldquo;{item.text}&rdquo;</p>
            {(item.source || item.author) && (
              <cite className={styles.source}>
                —{' '}
                {item.sourceHref ? (
                  <Link href={item.sourceHref}>{item.source || item.author}</Link>
                ) : (
                  item.source || item.author
                )}
              </cite>
            )}
            {item.comment?.map((paragraph, i) => (
              <p key={i} className={styles.comment}>
                {paragraph}
              </p>
            ))}
            {item.extra}
          </blockquote>
        ))}
      </div>
    </section>
  );
};
