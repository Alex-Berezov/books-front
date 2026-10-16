import { Users } from 'lucide-react';
import Link from 'next/link';
import { AuthorPortrait } from '@/components/public/author/AuthorPortrait/AuthorPortrait';
import { formatLifeYears } from '@/lib/author/author-dates';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicSimilarAuthor } from '@/types/api-schema';
import styles from './AuthorSimilar.module.scss';

interface AuthorSimilarProps {
  lang: SupportedLang;
  authors: PublicSimilarAuthor[] | null | undefined;
}

/**
 * Похожие авторы (`product.md` F02, §15): карточки с портретом и годами жизни — теми же
 * `formatLifeYears`, что в шапке (решение арбитра 15.10.2026, `F02 | F02-3`, Р8), а не годами
 * карточки хаба. Ссылка — настоящий `href`; автор без перевода на язык страницы (`slug: null`) —
 * карточка без ссылки.
 */
export function AuthorSimilar({ lang, authors }: AuthorSimilarProps) {
  const list = authors ?? [];
  if (list.length === 0) return null;
  const t = createTranslator(lang);
  const bornPrefix = t('authors.bornPrefix');

  return (
    <section className={styles.section} aria-labelledby="author-similar-title">
      <h2 id="author-similar-title" className={styles.title}>
        <Users size={20} className={styles.icon} aria-hidden="true" />
        {t('author.similar')}
      </h2>
      <ul className={styles.list}>
        {list.map((author, index) => {
          const years = formatLifeYears(author.birthDate, author.deathDate, bornPrefix);
          const body = (
            <>
              <span className={styles.avatar}>
                <AuthorPortrait
                  photoUrl={author.photoUrl}
                  alt=""
                  sizes="64px"
                  iconSize={28}
                  photoClassName={styles.photo}
                  iconClassName={styles.avatarIcon}
                />
              </span>
              <span className={styles.info}>
                <span className={styles.name}>{author.name}</span>
                {years && <span className={styles.years}>{years}</span>}
              </span>
            </>
          );
          return (
            <li key={`${author.slug ?? 'text'}-${index}`}>
              {author.slug ? (
                <Link href={`/${lang}/author/${author.slug}`} className={styles.card}>
                  {body}
                </Link>
              ) : (
                <div className={styles.card}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
