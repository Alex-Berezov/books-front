import { Lightbulb } from 'lucide-react';
import { createTranslator } from '@/lib/i18n/translate';
import { isSafeHref } from '@/lib/utils/safe-href';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { AuthorFunFact } from '@/types/api-schema';
import styles from './AuthorFunFacts.module.scss';

interface AuthorFunFactsProps {
  lang: SupportedLang;
  facts: AuthorFunFact[] | null | undefined;
}

/**
 * Интересные факты (`product.md` F02, §14): карточки, у каждой источник — ссылкой с названием.
 * Факт без годной ссылки (пусто, не `http(s)`, `LEGACY-447`) не выводится: импорт такой
 * не пропускает, фильтр — защита на старые данные. Ни одного факта — блока нет.
 */
export function AuthorFunFacts({ lang, facts }: AuthorFunFactsProps) {
  const list = (facts ?? []).filter(
    (fact) =>
      fact.text.trim() !== '' && fact.sourceTitle.trim() !== '' && isSafeHref(fact.sourceUrl)
  );
  if (list.length === 0) return null;
  const t = createTranslator(lang);

  return (
    <section className={styles.section} aria-labelledby="author-fun-facts-title">
      <h2 id="author-fun-facts-title" className={styles.title}>
        <Lightbulb size={20} className={styles.icon} aria-hidden="true" />
        {t('author.funFacts')}
      </h2>
      <ul className={styles.list}>
        {list.map((fact, index) => (
          <li key={`${fact.sourceUrl}-${index}`} className={styles.card}>
            <p className={styles.text}>{fact.text}</p>
            <a
              href={fact.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.source}
            >
              {fact.sourceTitle}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
