import { Users } from 'lucide-react';
import Link from 'next/link';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicSimilarAuthor } from '@/types/api-schema';
import styles from './AuthorSimilar.module.scss';

interface AuthorSimilarProps {
  lang: SupportedLang;
  authors: PublicSimilarAuthor[] | null | undefined;
}

/**
 * Похожие авторы (F02-1): настоящие ссылки, а не кнопки — поисковик ходит по `href`.
 * Автор без перевода на язык страницы (`slug: null`) — имя текстом. Карточки — F02-4.
 */
export function AuthorSimilar({ lang, authors }: AuthorSimilarProps) {
  const list = authors ?? [];
  if (list.length === 0) return null;
  const t = createTranslator(lang);

  return (
    <section className={styles.section} aria-labelledby="author-similar-title">
      <h2 id="author-similar-title" className={styles.title}>
        <Users size={20} className={styles.icon} aria-hidden="true" />
        {t('author.similar')}
      </h2>
      <div className={styles.list}>
        {list.map((author, index) =>
          author.slug ? (
            <Link key={author.slug} href={`/${lang}/author/${author.slug}`} className={styles.link}>
              {author.name}
            </Link>
          ) : (
            <span key={`text-${index}`} className={styles.name}>
              {author.name}
            </span>
          )
        )}
      </div>
    </section>
  );
}
