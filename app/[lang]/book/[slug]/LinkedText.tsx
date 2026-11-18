import { Fragment } from 'react';
import Link from 'next/link';
import { linkText, markLinked, type LinkSession } from '@/lib/book-world/link-entities';
import styles from './LinkedText.module.scss';

/**
 * Перелинковка (F08-5): имена героев и «глава N» - ссылками, первое упоминание на странице. Инлайн,
 * без `<p>`: для полей, которые печатаются мимо абзацев. `links === null` - текст как есть.
 * Не строка (старая запись анализа без поля) - ничего: страница не падает на `linkText`.
 */
export function LinkedText({
  text,
  links,
}: {
  text: string | null | undefined;
  links: LinkSession | null;
}) {
  if (typeof text !== 'string') return null;
  if (!links) return <>{text}</>;
  return (
    <>
      {linkText(text, links).map((seg, j) =>
        seg.kind === 'text' ? (
          <Fragment key={j}>{seg.text}</Fragment>
        ) : (
          <Link key={j} href={seg.href} className={styles.link}>
            {seg.text}
          </Link>
        )
      )}
    </>
  );
}

/**
 * Ссылка на сущность стоит на странице помимо текста (заголовок карточки, связь героя): отметка
 * в сессии - имя дальше по тексту ссылкой не становится и слот не тратит (§11 п.1). Отметка - в рендере,
 * то есть в порядке документа, как и само «первое упоминание»; вывода нет.
 */
export function LinkedMark({ links, entityKey }: { links: LinkSession | null; entityKey: string }) {
  markLinked(links, entityKey);
  return null;
}
