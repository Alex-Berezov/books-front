import { Clapperboard } from 'lucide-react';
import Link from 'next/link';
import { AUTHOR_ADAPTATION_KINDS, AUTHOR_PAGE_LIMITS } from '@/lib/admin/author-page-blocks';
import { formatBlockYear } from '@/lib/author/author-dates';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorAdaptation } from '@/types/api-schema';
import styles from './AuthorAdaptations.module.scss';

interface AuthorAdaptationsProps {
  lang: SupportedLang;
  adaptations: PublicAuthorAdaptation[] | null | undefined;
}

/** Не больше 10 пунктов (`product.md` F02, §13) — тот же предел, что у формы и DTO. */
export const AUTHOR_ADAPTATIONS_LIMIT = AUTHOR_PAGE_LIMITS.adaptations;

const KINDS: ReadonlySet<string> = new Set(AUTHOR_ADAPTATION_KINDS);

/** Вид вне словаря (старые данные) — «другое», а не сырой ключ словаря на странице. */
const kindKey = (kind: string) => `author.adaptationKind.${KINDS.has(kind) ? kind : 'other'}`;

/**
 * Экранизации и постановки (`product.md` F02, §13): «{название} ({год}) — {вид}» и «по книге …».
 * Порядок ответа (сервер сортирует по году, без года — в конце). «По книге»: книга сайта —
 * её название ссылкой, иначе `basedOn` текстом, нет обоих — строки нет (решение арбитра
 * 16.10.2026, `F02 | F02-4`, Р7).
 */
export function AuthorAdaptations({ lang, adaptations }: AuthorAdaptationsProps) {
  const list = (adaptations ?? [])
    .filter((item) => item.title.trim() !== '')
    .slice(0, AUTHOR_ADAPTATIONS_LIMIT);
  if (list.length === 0) return null;
  const t = createTranslator(lang);

  return (
    <section className={styles.section} aria-labelledby="author-adaptations-title">
      <h2 id="author-adaptations-title" className={styles.title}>
        <Clapperboard size={20} className={styles.icon} aria-hidden="true" />
        {t('author.adaptations')}
      </h2>
      <ul className={styles.list}>
        {list.map((item, index) => {
          const basedOn = item.basedOn?.trim();
          return (
            <li key={`${item.title}-${index}`} className={styles.item}>
              <span>
                <span className={styles.name}>{item.title}</span>
                {typeof item.year === 'number' &&
                  ` (${formatBlockYear(item.year, t('author.bce'))})`}
                {` — ${t(kindKey(item.kind))}`}
              </span>
              {(item.book || basedOn) && (
                <span className={styles.basedOn}>
                  {t('author.basedOn')}{' '}
                  {item.book ? (
                    <Link href={`/${lang}/book/${item.book.slug}`}>{item.book.title}</Link>
                  ) : (
                    basedOn
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
