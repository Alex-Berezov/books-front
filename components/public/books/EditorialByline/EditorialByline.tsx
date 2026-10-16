import Link from 'next/link';
import type { EditorialBylineProps } from './EditorialByline.types';
import styles from './EditorialByline.module.scss';

/**
 * Подпись редакции (`product.md` §6.1): на странице книги без даты, на странице пересказа с датой,
 * на странице автора с датой и якорем `authors`.
 * Не читает хуки, поэтому годится и серверной странице, и клиентскому `SummaryClient`.
 */
export const EditorialByline = ({
  lang,
  prefix = '',
  teamLabel,
  dateText,
  anchor = 'who',
}: EditorialBylineProps) => (
  <p className={styles.byline}>
    {prefix}
    <Link href={`/${lang}/editorial-policy#${anchor}`} className={styles.link}>
      {teamLabel}
    </Link>
    {dateText ? ` · ${dateText}` : null}
  </p>
);
