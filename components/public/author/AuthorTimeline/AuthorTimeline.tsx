import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { formatBlockYear } from '@/lib/author/author-dates';
import { createTranslator } from '@/lib/i18n/translate';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { PublicAuthorTimelineEvent } from '@/types/api-schema';
import styles from './AuthorTimeline.module.scss';

interface AuthorTimelineProps {
  lang: SupportedLang;
  events: PublicAuthorTimelineEvent[] | null | undefined;
}

/**
 * Хронология (`product.md` F02, §9): лента «год — событие» в порядке ответа (сервер сортирует
 * по году). Событие про книгу сайта — весь текст ссылкой на книгу с иконкой перед ним: название
 * книги уже в тексте, отдельно оно не повторяется (решение арбитра 16.10.2026, `F02 | F02-4`,
 * Р11). Пусто — блока нет.
 */
export function AuthorTimeline({ lang, events }: AuthorTimelineProps) {
  const list = (events ?? []).filter(
    (event) => typeof event.year === 'number' && event.text.trim() !== ''
  );
  if (list.length === 0) return null;
  const t = createTranslator(lang);

  return (
    <section className={styles.section} aria-labelledby="author-timeline-title">
      <h2 id="author-timeline-title" className={styles.title}>
        {t('author.timeline')}
      </h2>
      <ol className={styles.list}>
        {list.map((event, index) => (
          <li key={`${event.year}-${index}`} className={styles.item}>
            <span className={styles.year}>{formatBlockYear(event.year, t('author.bce'))}</span>
            <p className={styles.text}>
              {event.book ? (
                <Link href={`/${lang}/book/${event.book.slug}`} className={styles.book}>
                  <BookOpen size={14} aria-hidden="true" />
                  {event.text}
                </Link>
              ) : (
                event.text
              )}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
