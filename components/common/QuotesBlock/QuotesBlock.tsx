import { Fragment, type FC, type ReactNode } from 'react';
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
  /** Под заголовком, до цитат (ссылка «Разбор» на странице книги, F03-3) - как у соседних разделов. */
  titleExtra?: ReactNode;
  /**
   * Обёртка карточки цитаты по её номеру (спойлер-остров мира, `F08-10b`). Без пропа карточка
   * выводится как есть - так у анализа.
   */
  wrapItem?: (card: ReactNode, index: number) => ReactNode;
}

/**
 * Класс карточки цитаты: обёртка `wrapItem`, которая ставит в ячейку сетки своё содержимое (подпись
 * свёрнутой цитаты, `F08-10b`), берёт рамку отсюда, а не копией стиля.
 */
export const quoteCardClassName = styles.card;

export const QuotesBlock: FC<QuotesBlockProps> = ({
  items,
  title = 'Quotes',
  className = '',
  icon,
  id,
  titleExtra,
  wrapItem,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section id={id} className={`${styles.quotesBlock} ${className}`.trim()}>
      <h2 className={styles.title}>
        {icon && <span className={styles.icon}>{icon}</span>}
        {title}
      </h2>
      {titleExtra}
      <div className={styles.grid}>
        {items.map((item, index) => {
          const card = (
            <blockquote className={styles.card}>
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
          );
          return <Fragment key={index}>{wrapItem ? wrapItem(card, index) : card}</Fragment>;
        })}
      </div>
    </section>
  );
};
