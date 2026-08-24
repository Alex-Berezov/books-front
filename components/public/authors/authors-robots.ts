import { shouldNoindexPaginatedPage } from '@/lib/utils/seo-indexing';
import type { AuthorsQuery } from './authors-href';
import type { Metadata } from 'next';
import { AUTHORS_PAGE_SIZE } from './authors-page-data';

/**
 * Решение об индексации хаба авторов и его буквенных страниц — одно на обе.
 *
 * 🔴 Лестница была выписана дважды, по разу на страницу, и отличалась одной
 * веткой. Любая правка политики индексации требовала найти оба места; забыть
 * одно значило развести хаб и его же буквы по разным правилам — ровно тот класс
 * тихой SEO-регрессии, против которого написана половина комментариев
 * в `lib/utils/seo-indexing.ts`.
 */
export interface AuthorsRobotsInput {
  query: AuthorsQuery;
  /** `null` — счётчик получить не удалось. Не ноль. */
  total: number | null;
  /** Число авторов под этой буквой; `null` на хабе и когда буква неизвестна. */
  letterCount?: number | null;
  /** Редакторское значение из CMS-страницы, если оно задано. */
  editorial?: Metadata['robots'];
}

export interface AuthorsRobotsDecision {
  /** `undefined` — тега нет вовсе, а не «index». */
  robots: Metadata['robots'] | undefined;
  /**
   * Снимать ли canonical и языковые альтернативы.
   *
   * 🔴 Только там, где canonical указывал бы на **другой** адрес. Страница,
   * закрытая от индексации, не имеет права одновременно объявлять «моя
   * каноничная версия — вот тот индексируемый адрес»: два сигнала противоречат
   * друг другу. В этом репозитории на те же грабли уже наступали и чинили
   * руками — `app/[lang]/catalog/page.tsx` намеренно обходит `getPageMetadata`
   * для фильтрованной ветки.
   *
   * Ветки «пустая буква» и «страница за диапазоном» canonical сохраняют: он
   * указывает на них же самих, и противоречия там нет.
   */
  dropAlternates: boolean;
}

/** `noindex, follow`: страницу не индексируем, по ссылкам с неё ходим. */
const NOINDEX_FOLLOW = { index: false, follow: true } as const;

/**
 * Что поставить в `robots` — и надо ли вообще.
 *
 * `undefined` в `robots` означает «тега нет». Это тот же перекос, что
 * в `buildRobotsByCount`: `200 + noindex` поисковик исполняет и возвращает
 * страницу неделями, а отсутствие тега во время сбоя не стоит ничего.
 */
export function resolveAuthorsRobots({
  query,
  total,
  letterCount = null,
  editorial,
}: AuthorsRobotsInput): AuthorsRobotsDecision {
  // Поиск — выдача под запрос читателя, а не страница сайта: адресов с
  // `?search=` бесконечно много, и все они дубли одной сетки. Здесь canonical
  // ведёт на чистый адрес, то есть на другую страницу, — снимаем его.
  if (query.search) return { robots: NOINDEX_FOLLOW, dropAlternates: true };

  // Своя буква, но за ней никого: страница честно пуста, держать её в индексе
  // незачем. В указателе она уже погашена, в карту сайта не попадает.
  if (letterCount === 0) return { robots: NOINDEX_FOLLOW, dropAlternates: false };

  // Пагинация закрывается не поголовно: вторая и третья страницы хаба —
  // нормальные страницы. Закрывается только страница за пределами диапазона,
  // и только когда `total` действительно известен.
  if (total !== null && shouldNoindexPaginatedPage(query.page, total, AUTHORS_PAGE_SIZE)) {
    return { robots: NOINDEX_FOLLOW, dropAlternates: false };
  }

  return { robots: editorial, dropAlternates: false };
}

/** Накладывает решение на метаданные страницы. */
export function applyAuthorsRobots(
  meta: Metadata,
  { robots, dropAlternates }: AuthorsRobotsDecision
): Metadata {
  const base = dropAlternates ? stripAlternates(meta) : meta;
  return robots ? { ...base, robots } : base;
}

/** Убирает canonical, языковые альтернативы и `og:url` — все указатели на другой адрес. */
function stripAlternates(meta: Metadata): Metadata {
  const { alternates: _alternates, openGraph, ...rest } = meta;
  if (!openGraph) return rest;

  const { url: _url, ...openGraphWithoutUrl } = openGraph as Record<string, unknown>;
  return { ...rest, openGraph: openGraphWithoutUrl as Metadata['openGraph'] };
}
