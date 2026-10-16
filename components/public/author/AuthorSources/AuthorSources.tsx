import { ExternalLink, Library } from 'lucide-react';
import {
  AuthorPhotoCredit,
  shownPhotoCredit,
} from '@/components/public/author/AuthorPhotoCredit/AuthorPhotoCredit';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { formatUpdatedDate } from '@/lib/author/author-dates';
import { collectAuthorSources } from '@/lib/author/author-sources';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorDetail } from '@/types/api-schema';
import styles from './AuthorSources.module.scss';

interface AuthorSourcesProps {
  lang: SupportedLang;
  author: Pick<
    PublicAuthorDetail,
    'sources' | 'wikipediaUrl' | 'wikidataUrl' | 'photoUrl' | 'photoCredit' | 'updatedAt'
  >;
}

/**
 * Источники и подпись (`product.md` F02, §16): список источников, повтор атрибуции портрета
 * и «Редакция Bibliaris · обновлено {дата}». Заголовок и список — только при содержимом;
 * подпись выводится всегда, и у минимального автора тоже (решение арбитра 16.10.2026,
 * `F02 | F02-4`, Р4). Подпись ведёт в раздел редполитики о страницах авторов, а не на `#who` (Р2).
 */
export function AuthorSources({ lang, author }: AuthorSourcesProps) {
  const t = createTranslator(lang);
  const links = collectAuthorSources(author);
  const credit = shownPhotoCredit(author.photoUrl, author.photoCredit);
  const updated = formatUpdatedDate(author.updatedAt, lang);

  return (
    <footer className={styles.footer}>
      {(links.length > 0 || credit) && (
        <section className={styles.section} aria-labelledby="author-sources-title">
          <h2 id="author-sources-title" className={styles.title}>
            <Library size={20} className={styles.icon} aria-hidden="true" />
            {t('author.sources')}
          </h2>
          <ul className={styles.list}>
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {link.title}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
            ))}
            {credit && (
              <li className={styles.credit}>
                <AuthorPhotoCredit lang={lang} credit={credit} />
              </li>
            )}
          </ul>
        </section>
      )}
      <EditorialByline
        lang={lang}
        teamLabel={t('book.editorialTeam')}
        dateText={updated ? t('book.updatedOn').replace('{date}', () => updated) : undefined}
        anchor="authors"
      />
    </footer>
  );
}
