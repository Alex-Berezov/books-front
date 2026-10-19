import { Fragment } from 'react';
import Link from 'next/link';
import { toChapterRanges } from '@/lib/book-analysis/format';
import type { ChapterLinker } from './AnalysisBlocks';
import styles from './analysis.module.scss';

/**
 * Больше скольких глав у версии клеток полосы нет, остаётся текстовый дубль со ссылками
 * (решение арбитра `F03 | F03-3`, В4): клетка на главу на длинной книге - тысячи пустых
 * элементов на каждой теме кэшируемой страницы.
 */
const THEME_STRIP_MAX_CHAPTERS = 120;

/**
 * Полоса «где звучит тема» (`product.md` §9): клетка на каждую главу версии, отмеченные темой -
 * цветом темы и ссылкой в читалку; под ней текстом «Главы: 1, 3, 7–9». Отмечаются только главы,
 * которые есть в версии, - полоса и подпись совпадают. Версия без глав или тема без существующих
 * глав - ничего. Цвет задаёт класс `.themeN` карточки темы (`--theme-color`).
 */
export function ThemeStrip({
  themeChapters,
  chapterNumbers,
  linker,
  label,
  chaptersLabel,
}: {
  themeChapters: readonly number[] | null | undefined;
  /** Номера глав версии по возрастанию. */
  chapterNumbers: readonly number[];
  linker: ChapterLinker;
  label: string;
  chaptersLabel: string;
}) {
  const existing = new Set(chapterNumbers);
  const marked = new Set((themeChapters ?? []).filter((n) => existing.has(n)));
  if (marked.size === 0) return null;

  const ranges = toChapterRanges([...marked]);
  const showCells = chapterNumbers.length <= THEME_STRIP_MAX_CHAPTERS;

  return (
    <div className={styles.strip}>
      {showCells ? (
        <ol className={styles.stripCells} aria-label={label}>
          {chapterNumbers.map((n) => {
            const href = marked.has(n) ? linker.href(n) : null;
            return (
              <li key={n} className={marked.has(n) ? styles.stripCellOn : styles.stripCell}>
                {href ? (
                  <Link
                    href={href}
                    prefetch={false}
                    className={styles.stripLink}
                    aria-label={linker.label(n)}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}
      <p className={styles.stripText}>
        <span className={styles.chaptersLabel}>{chaptersLabel}: </span>
        {ranges.map((r, i) => (
          <Fragment key={r.from}>
            {i > 0 ? ', ' : null}
            <RangeRef from={r.from} to={r.to} linker={linker} />
          </Fragment>
        ))}
      </p>
    </div>
  );
}

/**
 * Отрезок глав: концы - ссылками на свои главы, между ними короткое тире. Ссылки полосы и подписи -
 * без предзагрузки: их до сотни на тему, а читалка рендерится на каждый запрос (ревью F03-3).
 */
function RangeRef({ from, to, linker }: { from: number; to: number; linker: ChapterLinker }) {
  if (from === to) return <ChapterNumber n={from} linker={linker} />;
  return (
    <>
      <ChapterNumber n={from} linker={linker} />–<ChapterNumber n={to} linker={linker} />
    </>
  );
}

function ChapterNumber({ n, linker }: { n: number; linker: ChapterLinker }) {
  const href = linker.href(n);
  return href ? (
    <Link href={href} prefetch={false} className={styles.textLink}>
      {n}
    </Link>
  ) : (
    <span>{n}</span>
  );
}
