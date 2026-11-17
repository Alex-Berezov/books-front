/**
 * Куда ведёт переключатель языка и какие языки он предлагает - по разделу страницы книги.
 * Без серверных зависимостей: файл грузит клиентский `LanguageSwitcher`.
 */

import { BOOK_WORLD_KEY_REGEX } from '@/lib/admin/book-world-blocks';
import { switchLangInPath, type SupportedLang } from '@/lib/i18n/lang';
import { versionHasAnalysis } from '@/lib/seo/analysis-path';
import { versionHasSummary } from '@/lib/seo/summary-path';
import { versionHasWorld, worldEntityPath } from '@/lib/seo/world-path';
import type { VersionPreview } from '@/types/api-schema';

export type SwitcherVersion = Pick<VersionPreview, 'language' | 'slug' | '_count' | 'worldKeys'>;

export interface SwitcherTarget {
  /** Есть ли страница у версии языка; `null` - страница есть у любой версии. */
  has: ((version: SwitcherVersion) => boolean) | null;
  /**
   * Текущий язык остаётся в списке всегда: страница открыта, даже если счётчик её языка отстал
   * (доступ решает ручка, а не счётчик - решение арбитра `F03 | F03-2`).
   */
  keepCurrent: boolean;
  /** Адрес страницы на языке `lang`; `slug` - слаг версии этого языка, если он известен. */
  path: (lang: SupportedLang, slug: string | null) => string;
}

interface SectionRule {
  has: (version: SwitcherVersion) => boolean;
  keepCurrent: boolean;
  /**
   * Подстраница раздела ведёт на сам раздел другого языка: разделы пересказа `/summary/{n}` каждый
   * язык режет по-своему (F04 `product.md` §5), у `/wiki/{что-то}` без ключа пары нет.
   */
  dropsSubpage: boolean;
}

/**
 * Разделы страницы книги `/{lang}/book/{slug}/{раздел}`, которые есть не у каждого языка: другой
 * язык отвечает 404. Правило то же, что у hreflang страницы. Раздела нет в таблице - страница
 * есть у любой версии.
 */
const SECTION_RULES = new Map<string, SectionRule>([
  ['summary', { has: versionHasSummary, keepCurrent: false, dropsSubpage: true }],
  ['analysis', { has: versionHasAnalysis, keepCurrent: true, dropsSubpage: false }],
  ['wiki', { has: versionHasWorld, keepCurrent: true, dropsSubpage: true }],
]);

/** Тот же путь на другом языке; слаг версии языка, если известен, встаёт на место слага книги. */
function samePathIn(parts: readonly string[]): SwitcherTarget['path'] {
  return (lang, slug) => {
    if (!slug) return switchLangInPath(parts.join('/'), lang);
    const updated = [...parts];
    updated[1] = lang;
    updated[3] = slug;
    return updated.join('/');
  };
}

/**
 * Страница сущности `/wiki/{key}` (F08-3b, `product.md` §1 п.3): язык предлагается, только если
 * сущность с этим ключом публична у его версии (`worldKeys` обзора книги); ключ один на все языки.
 */
function worldEntityTarget(parts: readonly string[], key: string): SwitcherTarget {
  const fallback = samePathIn(parts.slice(0, 6));
  return {
    has: (version) => Boolean(version.worldKeys?.some((entity) => entity.key === key)),
    keepCurrent: true,
    path: (lang, slug) => (slug ? `/${lang}${worldEntityPath(slug, key)}` : fallback(lang, null)),
  };
}

/** Правило переключателя для пути, разбитого по `/`: `['', lang, 'book', slug, раздел, ...]`. */
export function resolveSwitcherTarget(parts: readonly string[]): SwitcherTarget {
  const section = parts[2] === 'book' ? parts[4] : undefined;
  const subpage = parts[5];

  if (section === 'wiki' && subpage && BOOK_WORLD_KEY_REGEX.test(subpage)) {
    return worldEntityTarget(parts, subpage);
  }

  const rule = section ? SECTION_RULES.get(section) : undefined;
  const base = rule?.dropsSubpage && subpage ? parts.slice(0, 5) : parts;
  return {
    has: rule?.has ?? null,
    keepCurrent: rule?.keepCurrent ?? false,
    path: samePathIn(base),
  };
}
