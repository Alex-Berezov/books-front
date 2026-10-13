import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { EditionNotesProps } from './EditionNotes.types';
import styles from './EditionNotes.module.scss';
import { buildEditionNotesRows } from './editionNotesRows';

/**
 * Блок «Об издании» на странице книги (`product.md` §6.2, `tech.md` §7.2). Серверный компонент:
 * данные берутся из уже загруженного обзора. Постоянная строка про общественное достояние одна
 * на все книги и не читает `copyrightStatus` и поля прав; без других строк блока нет вовсе. Имя и ссылка на источник текста
 * не показываются (решение владельца D6).
 */
export const EditionNotes = ({
  lang,
  version,
  firstPublishedYear,
  shownTitle,
}: EditionNotesProps) => {
  const { book } = getDictionary(lang);
  // Во французском перед двоеточием неразрывный пробел, как на страницах доверия.
  const separator = lang === 'fr' ? '\u00a0: ' : ': ';
  const rows = buildEditionNotesRows(
    { version, firstPublishedYear, shownTitle, lang },
    {
      firstPublished: book.editionFirstPublished,
      originalLanguage: book.editionOriginalLanguage,
      originalTitle: book.editionOriginalTitle,
      translator: book.editionTranslator,
    }
  );

  // Нет ни одной строки, кроме постоянной, - нет и блока (`product.md` §6.2).
  if (rows.length === 0) return null;

  return (
    <section className={styles.notes} aria-labelledby="edition-notes-title">
      <h2 id="edition-notes-title" className={styles.title}>
        {book.editionTitle}
      </h2>
      <ul className={styles.list}>
        {rows.map((row) => (
          <li key={row.label} className={styles.row}>
            {row.label}
            {separator}
            {row.value}
          </li>
        ))}
        <li className={styles.row}>
          {book.editionPublicDomain}{' '}
          <Link href={`/${lang}/editorial-policy#sources`} className={styles.link}>
            {book.editionLearnMore}
          </Link>
        </li>
      </ul>
    </section>
  );
};
