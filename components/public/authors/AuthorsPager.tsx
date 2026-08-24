import type { FC } from 'react';
import Link from 'next/link';
import styles from './AuthorsPager.module.scss';

export interface AuthorsPagerProps {
  page: number;
  totalPages: number;
  /** Собирает адрес страницы N, сохраняя поиск и сортировку. */
  buildHref: (page: number) => string;
  labels: {
    showMore: string;
    pagination: string;
    pageLabel: string;
  };
}

/** Сколько соседних номеров показывать вокруг текущего. */
const WINDOW = 2;

/**
 * Номера страниц с многоточиями: 1 … 4 5 [6] 7 8 … 20.
 *
 * Не все подряд: на тысяче авторов постраничных ссылок было бы сорок две,
 * и они заняли бы больше места, чем сама выдача.
 */
export const buildPageList = (page: number, totalPages: number): Array<number | 'gap'> => {
  const pages = new Set<number>([1, totalPages]);
  for (let at = page - WINDOW; at <= page + WINDOW; at += 1) {
    if (at >= 1 && at <= totalPages) pages.add(at);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const withGaps: Array<number | 'gap'> = [];
  sorted.forEach((value, at) => {
    if (at === 0) {
      withGaps.push(value);
      return;
    }

    const gapSize = value - sorted[at - 1] - 1;
    // Многоточие вместо одной-единственной страницы — обмен ссылки на символ:
    // места занимает столько же, а страница из HTML пропадает. Прячем только
    // тогда, когда прячется больше одной.
    if (gapSize === 1) withGaps.push(value - 1);
    else if (gapSize > 1) withGaps.push('gap');

    withGaps.push(value);
  });

  return withGaps;
};

/**
 * Пагинация хаба авторов.
 *
 * 🔴 Серверный компонент и обычные ссылки — не кнопка с обработчиком.
 * «Показать ещё» здесь удобство поверх постраничных ссылок, а не замена им:
 * без JavaScript обе формы обязаны работать, и ссылки на вторую страницу
 * обязаны быть в серверном HTML, иначе поисковик не увидит ничего дальше
 * первых двадцати четырёх авторов.
 */
export const AuthorsPager: FC<AuthorsPagerProps> = ({ page, totalPages, buildHref, labels }) => {
  if (totalPages <= 1) return null;

  const pages = buildPageList(page, totalPages);

  return (
    <div className={styles.pager}>
      {page < totalPages && (
        <Link className={styles.showMore} href={buildHref(page + 1)} rel="next">
          {labels.showMore}
        </Link>
      )}

      <nav aria-label={labels.pagination} className={styles.pages}>
        {pages.map((entry, at) =>
          entry === 'gap' ? (
            <span className={styles.gap} key={`gap-${at}`}>
              …
            </span>
          ) : (
            <Link
              aria-current={entry === page ? 'page' : undefined}
              aria-label={`${labels.pageLabel} ${entry}`}
              className={entry === page ? `${styles.page} ${styles.current}` : styles.page}
              href={buildHref(entry)}
              key={entry}
            >
              {entry}
            </Link>
          )
        )}
      </nav>
    </div>
  );
};
