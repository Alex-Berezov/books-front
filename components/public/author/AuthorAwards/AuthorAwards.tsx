import { Award } from 'lucide-react';
import { formatBlockYear } from '@/lib/author/author-dates';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorAward } from '@/types/api-schema';
import styles from './AuthorAwards.module.scss';

interface AuthorAwardsProps {
  lang: SupportedLang;
  awards: PublicAuthorAward[] | null | undefined;
}

/**
 * Премии и награды (`product.md` F02, §12): «год — название», номинация — с пометкой. Порядок
 * ответа: сервер сортирует по году, без года — в конце; у такой строки числа перед названием нет.
 */
export function AuthorAwards({ lang, awards }: AuthorAwardsProps) {
  const list = (awards ?? []).filter((award) => award.name.trim() !== '');
  if (list.length === 0) return null;
  const t = createTranslator(lang);

  return (
    <section className={styles.section} aria-labelledby="author-awards-title">
      <h2 id="author-awards-title" className={styles.title}>
        <Award size={20} className={styles.icon} aria-hidden="true" />
        {t('author.awards')}
      </h2>
      <ul className={styles.list}>
        {list.map((award, index) => (
          <li key={`${award.name}-${index}`} className={styles.item}>
            {typeof award.year === 'number' && (
              <span className={styles.year}>{formatBlockYear(award.year, t('author.bce'))} —</span>
            )}
            <span className={styles.name}>{award.name}</span>
            {award.nomination && (
              <span className={styles.nomination}>{t('author.nomination')}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
