import { BOOK_WORLD_KEY_REGEX } from '@/lib/admin/book-world-blocks';
import { analysisPageSlug, ownClusterOrNone } from '@/lib/seo/book-analysis';
import { buildIndexableAlternates } from '@/lib/seo/hreflang-alternates';
import { buildLangUrl } from '@/lib/seo/urls';
import { worldEntityPath, worldPath } from '@/lib/seo/world-path';
import { truncateAtWord } from '@/lib/utils/html-text';
import type { BookOverview, BookWorldAlternate, VersionPreview } from '@/types/api-schema';

/**
 * Страницы мира книги - `/{lang}/book/{slug}/wiki[/{key}]` (F08-3b, `product.md` §16). Правила выбора
 * версии, кластера hreflang и описания - здесь, одни на общую страницу и страницу сущности.
 * Своей сборки кластера на фронте нет: его считает бэкенд (`world-alternates.ts`, решение арбитра
 * `F08 | F08-3a`), он приходит полем `alternates` ответа списка и сущности.
 */

/**
 * Версия языка страницы - без проверки счётчика: доступ решает ответ ручки (404 - страницы нет).
 * Отката на другой язык нет (`product.md` §1 п.3).
 */
export function pickWorldPageVersion(
  book: Pick<BookOverview, 'versions'>,
  lang: string
): VersionPreview | null {
  return book.versions?.find((v) => v.language === lang) ?? null;
}

/** Слаг адреса страниц мира: то же правило, что у анализа и `bookCardSlug` бэкенда (`LEGACY-489`). */
export const worldPageSlug = analysisPageSlug;

/**
 * Кластер hreflang из поля `alternates` ответа: `{язык -> адрес, x-default}`. Пустой список -
 * страница не индексируется, кластера нет (`undefined`). `x-default` - по правилу анализа:
 * `en`, иначе первый язык. `entityKey` - страница сущности, без него - общая `/wiki`.
 */
export function buildWorldAlternates(
  alternates: readonly BookWorldAlternate[] | undefined,
  entityKey?: string
): Record<string, string> | undefined {
  return buildIndexableAlternates(
    (alternates ?? []).map((a) => ({ language: a.language, slug: a.slug, linkable: true })),
    (language, slug) =>
      buildLangUrl(language, entityKey ? worldEntityPath(slug, entityKey) : worldPath(slug))
  );
}

/**
 * Кластер hreflang страницы языка `lang`: `buildWorldAlternates` и `ownClusterOrNone` одним вызовом.
 * Им пользуются и мета страниц, и карта сайта - наборы языков у них не разойдутся.
 */
export function worldOwnCluster(
  alternates: readonly BookWorldAlternate[] | undefined,
  lang: string,
  entityKey?: string
): Record<string, string> | undefined {
  return ownClusterOrNone(buildWorldAlternates(alternates, entityKey), lang);
}

/** Описание страницы - не длиннее 160 знаков (`product.md` §15). */
export function describeWorld(text: string | null | undefined): string | undefined {
  return truncateAtWord((text ?? '').replace(/\s+/g, ' ').trim());
}

/**
 * Ключ сущности в адресе: латиница, цифры, дефис, до 60 знаков (проверка до запроса, `tech.md` §6).
 * Регэксп один с админкой - `lib/admin/book-world-blocks.ts`, файл без зависимостей.
 */
export function isWorldEntityKey(value: string): boolean {
  return BOOK_WORLD_KEY_REGEX.test(value);
}
