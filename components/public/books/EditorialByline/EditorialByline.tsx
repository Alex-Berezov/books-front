import Link from 'next/link';
import type { EditorialBylineProps } from './EditorialByline.types';
import styles from './EditorialByline.module.scss';

/**
 * Подпись редакции (`product.md` §6.1): на странице книги без даты, на странице пересказа с датой.
 * Не читает хуки, поэтому годится и серверной странице, и клиентскому `SummaryClient`.
 */
export const EditorialByline = ({
  lang,
  prefix = '',
  teamLabel,
  dateText,
}: EditorialBylineProps) => (
  <p className={styles.byline}>
    {prefix}
    <Link href={`/${lang}/editorial-policy#who`} className={styles.link}>
      {teamLabel}
    </Link>
    {dateText ? ` · ${dateText}` : null}
  </p>
);
