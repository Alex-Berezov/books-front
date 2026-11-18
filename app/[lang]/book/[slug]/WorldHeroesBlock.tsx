import Link from 'next/link';
import { markLinked, type LinkSession } from '@/lib/book-world/link-entities';
import type { BookWorldListEntity } from '@/types/api-schema';
import { BookSubpageSection } from './BookSubpageActions';
import styles from './WorldHeroesBlock.module.scss';
import { worldEntityHref } from './worldLinks';

export interface WorldHeroesBlockProps {
  id: string;
  title: string;
  /** Уже отобранные герои (`pickBookHeroes`): вызывающий считает их один раз. */
  heroes: readonly Pick<BookWorldListEntity, 'key' | 'name'>[];
  lang: string;
  /** Слаг мира книги (`worldPageSlug`). */
  worldSlug: string;
  /**
   * Сессия ссылок страницы, если ниже блока ещё есть тексты (анализ): каждый показанный герой уже
   * ссылка - в текстах после блока его имя ссылкой не становится (§11 п.1).
   */
  links?: LinkSession | null;
}

/**
 * «Герои книги» (F08-5, `product.md` §11 п.4): до шести героев со страницами ссылками. Героев нет -
 * блока нет (заглушек не рисуем). Порядок и предел - `pickBookHeroes` у вызывающего.
 */
export function WorldHeroesBlock({
  id,
  title,
  heroes,
  lang,
  worldSlug,
  links = null,
}: WorldHeroesBlockProps) {
  if (heroes.length === 0) return null;
  // Отметка - в рендере блока, то есть в порядке документа: тексты выше уже отрисованы.
  for (const h of heroes) markLinked(links, h.key);
  return (
    <BookSubpageSection id={id} title={title}>
      <ul className={styles.list}>
        {heroes.map((h) => (
          <li key={h.key}>
            <Link href={worldEntityHref(lang, worldSlug, h.key)}>{h.name}</Link>
          </li>
        ))}
      </ul>
    </BookSubpageSection>
  );
}
