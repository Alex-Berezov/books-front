import { BookOpen } from 'lucide-react';
import {
  AuthorPhotoCredit,
  shownPhotoCredit,
} from '@/components/public/author/AuthorPhotoCredit/AuthorPhotoCredit';
import { AuthorPortrait } from '@/components/public/author/AuthorPortrait/AuthorPortrait';
import { formatLifeYears } from '@/lib/author/author-dates';
import { pluralFormsOf, pluralize } from '@/lib/i18n/plural';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorDetail } from '@/types/api-schema';
import styles from './AuthorHero.module.scss';

interface AuthorHeroProps {
  lang: SupportedLang;
  author: Pick<
    PublicAuthorDetail,
    | 'name'
    | 'nativeName'
    | 'photoUrl'
    | 'photoCredit'
    | 'birthDate'
    | 'deathDate'
    | 'tagline'
    | 'booksTotal'
    | 'booksHasAudio'
    | 'booksAvgRating'
    | 'books'
  >;
}

/**
 * Шапка страницы автора (`product.md` F02, §4): портрет с подписью-атрибуцией, имя, родное
 * имя, годы жизни, строка «кто это» и счётчики. Счётчики — по всем книгам автора
 * (`booksTotal`, агрегаты ответа), а не по показанной порции; ответ бэкенда до F02-3
 * агрегатов не несёт — тогда по списку, как раньше.
 */
export function AuthorHero({ lang, author }: AuthorHeroProps) {
  const t = createTranslator(lang);
  const books = author.books ?? [];
  const total = author.booksTotal ?? books.length;
  const hasAudio = author.booksHasAudio ?? books.some((b) => b.hasAudio);
  const avgRating = averageRating(author.booksAvgRating, books);
  const nativeName =
    author.nativeName && author.nativeName.trim() !== author.name ? author.nativeName.trim() : null;
  const years = formatLifeYears(author.birthDate, author.deathDate, t('authors.bornPrefix'));
  const credit = shownPhotoCredit(author.photoUrl, author.photoCredit);

  return (
    <header className={styles.hero}>
      <figure className={styles.portrait}>
        <div className={styles.avatar}>
          <AuthorPortrait
            photoUrl={author.photoUrl}
            alt={author.name}
            sizes="150px"
            iconSize={40}
            priority
            photoClassName={styles.photo}
            iconClassName={styles.avatarIcon}
          />
        </div>
        {credit && (
          <figcaption className={styles.credit}>
            <AuthorPhotoCredit lang={lang} credit={credit} />
          </figcaption>
        )}
      </figure>

      <div className={styles.info}>
        <h1 className={styles.name}>{author.name}</h1>
        {nativeName && <p className={styles.nativeName}>{nativeName}</p>}
        {years && <p className={styles.years}>{years}</p>}
        {author.tagline && <p className={styles.tagline}>{author.tagline}</p>}

        {total > 0 && (
          <div className={styles.stats}>
            <span className={styles.statItem}>
              <BookOpen size={16} aria-hidden="true" />
              {total} {pluralize(total, lang, pluralFormsOf(t, 'common.bookCount'))}{' '}
              {t('author.booksInLibrary')}
            </span>
            {hasAudio && <span className={styles.audio}>{t('author.audiobooksAvailable')}</span>}
            {avgRating && (
              <span className={styles.statItem}>
                ★ {avgRating} {t('author.avgRating')}
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

/** Средняя оценка с одним знаком: из ответа; ответ до F02-3 — по списку книг, как раньше. */
function averageRating(
  fromResponse: number | null | undefined,
  books: Array<{ rating: number | null }>
): string | null {
  if (fromResponse !== undefined) return fromResponse === null ? null : fromResponse.toFixed(1);
  const ratings = books.map((b) => b.rating).filter((r): r is number => typeof r === 'number');
  return ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
    : null;
}
