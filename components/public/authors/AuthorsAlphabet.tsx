import type { FC } from 'react';
import Link from 'next/link';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AuthorLetter } from '@/types/api-schema';
import { authorsBasePath } from './authors-href';
import styles from './AuthorsAlphabet.module.scss';

export interface AuthorsAlphabetProps {
  letters: AuthorLetter[];
  lang: SupportedLang;
  /** Буква текущей страницы; на самом хабе — `null`. */
  activeLetter: string | null;
  labels: {
    all: string;
    alphabetLabel: string;
  };
}

/**
 * Алфавитный указатель: буквы алфавита языка страницы плюс группа `#`.
 *
 * Серверный компонент: это внутренние ссылки, и они обязаны быть в HTML ответа,
 * а не появляться после гидратации (`seo-rules.md`, правило 7.6).
 *
 * Счётчики приходят с бэкенда уже отфильтрованными «только авторы с книгами» —
 * тем же правилом, которым отфильтрована сетка. Иначе буква говорила бы «12»,
 * а под ней оказывалось восемь карточек.
 */
export const AuthorsAlphabet: FC<AuthorsAlphabetProps> = ({
  letters,
  lang,
  activeLetter,
  labels,
}) => {
  if (letters.length === 0) return null;

  const normalizedActive = activeLetter?.toLowerCase() ?? null;

  return (
    <nav aria-label={labels.alphabetLabel} className={styles.alphabet}>
      <Link
        className={activeLetter === null ? `${styles.letter} ${styles.active}` : styles.letter}
        href={`/${lang}/authors`}
      >
        {labels.all}
      </Link>

      {letters.map(({ letter, count }) => {
        if (count <= 0) {
          // Не ссылка: страницы за этой буквой нет, вести туда некуда.
          return (
            <span aria-disabled className={styles.empty} key={letter}>
              {letter}
            </span>
          );
        }

        const isActive = letter.toLowerCase() === normalizedActive;

        return (
          <Link
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? `${styles.letter} ${styles.active}` : styles.letter}
            href={authorsBasePath(lang, letter)}
            key={letter}
            title={`${letter} — ${count}`}
          >
            {letter}
          </Link>
        );
      })}
    </nav>
  );
};
