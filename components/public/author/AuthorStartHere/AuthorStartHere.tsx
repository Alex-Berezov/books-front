import { BookOpen } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { createTranslator } from '@/lib/i18n/translate';
import { isOptimizableHost } from '@/lib/utils/image-host';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorStartHere } from '@/types/api-schema';
import styles from './AuthorStartHere.module.scss';

interface AuthorStartHereProps {
  lang: SupportedLang;
  items: PublicAuthorStartHere[] | null | undefined;
}

/**
 * «С чего начать» (`product.md` F02, §6): 1–5 книг сайта в порядке данных — обложка,
 * название ссылкой и «почему с неё». Ненайденные книги бэкенд уже отбросил; пусто — блока нет.
 */
export function AuthorStartHere({ lang, items }: AuthorStartHereProps) {
  const list = (items ?? []).filter((item) => item.book);
  if (list.length === 0) return null;
  const t = createTranslator(lang);

  return (
    <section className={styles.section} aria-labelledby="author-start-title">
      <h2 id="author-start-title" className={styles.title}>
        {t('author.startHere')}
      </h2>
      <ol className={styles.list}>
        {list.map((item) => {
          const href = `/${lang}/book/${item.book.slug}`;
          return (
            <li key={item.book.slug} className={styles.item}>
              <Link href={href} className={styles.cover} tabIndex={-1} aria-hidden="true">
                {item.book.coverUrl ? (
                  <Image
                    src={item.book.coverUrl}
                    alt=""
                    fill
                    sizes="72px"
                    className={styles.coverImage}
                    unoptimized={!isOptimizableHost(item.book.coverUrl)}
                  />
                ) : (
                  <BookOpen size={24} className={styles.placeholder} />
                )}
              </Link>
              <div className={styles.body}>
                <Link href={href} className={styles.bookTitle}>
                  {item.book.title}
                </Link>
                {item.reason && <p className={styles.reason}>{item.reason}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
