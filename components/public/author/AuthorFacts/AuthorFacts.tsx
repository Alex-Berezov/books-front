import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatAuthorDate, formatBlockYear } from '@/lib/author/author-dates';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorDetail } from '@/types/api-schema';
import styles from './AuthorFacts.module.scss';

interface AuthorFactsProps {
  lang: SupportedLang;
  author: Pick<PublicAuthorDetail, 'birthDate' | 'deathDate' | 'facts' | 'notableWorks'>;
}

/** Окончание ключа подписи по полу автора; пол не задан — нейтральная форма (Р9, `F02 | F02-3`). */
function genderSuffix(gender: string | null | undefined): 'Male' | 'Female' | 'Neutral' {
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  return 'Neutral';
}

function joined(values: string[] | undefined): string | null {
  const list = (values ?? []).map((v) => v.trim()).filter(Boolean);
  return list.length > 0 ? list.join(', ') : null;
}

/**
 * Сводка фактов (`product.md` F02, §5): «название — значение», только заполненные строки,
 * в порядке спецификации. Ни одной строки — блока нет вовсе.
 */
export function AuthorFacts({ lang, author }: AuthorFactsProps) {
  const t = createTranslator(lang);
  const facts = author.facts ?? {};
  const gender = genderSuffix(facts.gender);
  const lifeEvent = (date: string | null | undefined, place: string | undefined) =>
    [formatAuthorDate(date, lang), place?.trim()].filter(Boolean).join(', ') || null;

  const works = author.notableWorks ?? [];
  const rows: Array<{ key: string; label: string; value: ReactNode | null }> = [
    {
      key: 'born',
      label: t(`author.factBorn${gender}`),
      value: lifeEvent(author.birthDate, facts.birthPlace),
    },
    {
      key: 'died',
      label: t(`author.factDied${gender}`),
      value: lifeEvent(author.deathDate, facts.deathPlace),
    },
    { key: 'country', label: t('author.factCountry'), value: facts.nationality?.trim() || null },
    { key: 'occupation', label: t('author.factOccupation'), value: joined(facts.occupations) },
    { key: 'movement', label: t('author.factMovement'), value: joined(facts.movements) },
    { key: 'genres', label: t('author.factGenres'), value: joined(facts.genres) },
    { key: 'language', label: t('author.factLanguage'), value: joined(facts.languages) },
    { key: 'pseudonyms', label: t('author.factPseudonyms'), value: joined(facts.pseudonyms) },
    {
      key: 'works',
      label: t('author.factNotableWorks'),
      value:
        works.length > 0 ? (
          <ul className={styles.works}>
            {works.map((work, index) => (
              <li key={`${work.title}-${index}`}>
                {/* Книга сайта — ссылкой на языке страницы, иначе текстом (`product.md` §1 п.2). */}
                {work.book ? (
                  <Link href={`/${lang}/book/${work.book.slug}`}>{work.book.title}</Link>
                ) : (
                  work.title
                )}
                {work.year ? ` (${formatBlockYear(work.year, t('author.bce'))})` : null}
              </li>
            ))}
          </ul>
        ) : null,
    },
  ];
  const filled = rows.filter((row) => row.value !== null);
  if (filled.length === 0) return null;

  return (
    <section className={styles.facts} aria-labelledby="author-facts-title">
      <h2 id="author-facts-title" className={styles.title}>
        {t('author.facts')}
      </h2>
      <dl className={styles.list}>
        {filled.map((row) => (
          <div key={row.key} className={styles.row}>
            <dt className={styles.label}>{row.label}</dt>
            <dd className={styles.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
