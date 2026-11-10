import { analysisPath, versionHasAnalysis } from '@/lib/seo/analysis-path';
import { buildIndexableAlternates } from '@/lib/seo/hreflang-alternates';
import { buildLangUrl } from '@/lib/seo/urls';
import { truncateAtWord } from '@/lib/utils/html-text';
import type { BookOverview, VersionPreview } from '@/types/api-schema';

/**
 * Страница анализа книги - `/{lang}/book/{slug}/analysis` (F03, D1). Правила выбора версии,
 * кластера hreflang и описания - здесь, одни на страницу, кнопку на странице книги и карту
 * сайта: разойдись они - кнопка или карта вели бы на 404 (как `book-summary.ts`).
 */

export { analysisPath, versionHasAnalysis };

/**
 * Версия, чей анализ показывает страница языка `lang`: версия **этого языка** с анализом
 * (`product.md` §1.2). Отката на другой язык нет - нет такой версии, страница отвечает 404.
 */
export function pickAnalysisVersion(
  book: Pick<BookOverview, 'versions'>,
  lang: string
): VersionPreview | null {
  return book.versions?.find((v) => v.language === lang && versionHasAnalysis(v)) ?? null;
}

/**
 * Версия, которую открывает сама страница анализа: версия **языка страницы**, без проверки
 * счётчика. Доступ к странице решает ответ ручки анализа (ядро); претензия анализ не закрывает
 * (правило владельца 07.11.2026, `T163`), счётчик `_count.analyses` (кнопка, hreflang, карта
 * сайта) - тоже только ядро (решение арбитра `F03 | F03-2`, D7).
 */
export function pickAnalysisPageVersion(
  book: Pick<BookOverview, 'versions'>,
  lang: string
): VersionPreview | null {
  return book.versions?.find((v) => v.language === lang) ?? null;
}

/** Версия в том виде, в каком её отдают и обзор книги, и список книг (карта сайта). */
type AnalysisAlternateVersion = {
  language?: string;
  slug?: string | null;
  _count?: { analyses?: number };
};

/**
 * Кластер hreflang страницы анализа: только языки, где страница существует (`product.md` §22).
 * Один вызов и для страницы, и для карты сайта: карта передаёт свой построитель адреса.
 */
export function buildAnalysisAlternates(
  versions: readonly AnalysisAlternateVersion[] | undefined,
  href: (language: string, slug: string) => string = (language, slug) =>
    buildLangUrl(language, analysisPath(slug))
): Record<string, string> | undefined {
  return buildIndexableAlternates(
    (versions ?? []).map((v) => ({
      language: v.language ?? '',
      slug: v.slug ?? '',
      linkable: Boolean(v.language) && versionHasAnalysis(v),
    })),
    href
  );
}

/**
 * Слаг адреса страницы анализа (`LEGACY-489`): свой слаг версии, без него слаг книги, без него
 * слаг адреса - правило `bookCardSlug` бэкенда (`books/src/modules/book/book-card.ts`, менять
 * вместе) и canonical страницы книги. Один на canonical меты, `Article.url` и ссылку «книга».
 */
export function analysisPageSlug(
  version: Pick<VersionPreview, 'slug'>,
  book: Pick<BookOverview, 'slug' | 'bookSlug'>,
  routeSlug: string
): string {
  return version.slug || book.bookSlug || book.slug || routeSlug;
}

/**
 * Кластер hreflang - только если в нём есть сама страница. Страховка на рассинхрон счётчика
 * и ручки (разный кэш ответов): с `T163` претензия не закрывает ни тот, ни другую, но счётчик
 * языка страницы может отстать и быть 0 при открытой странице. Кластер без себя - противоречивый
 * сигнал, лучше не отдавать его вовсе. Одно правило на мету страницы и карту сайта: у версии без
 * своего слага адрес анализа есть (`LEGACY-489`), а в кластере её нет - пункт 16 «ВЛАДЕЛЕЦ».
 */
export function ownClusterOrNone(
  alternates: Record<string, string> | undefined,
  lang: string
): Record<string, string> | undefined {
  return alternates && alternates[lang] ? alternates : undefined;
}

/** Описание страницы - начало главной мысли, не длиннее 160 знаков (`product.md` §5, §22). */
export function describeAnalysis(mainIdea: string | null | undefined): string | undefined {
  return truncateAtWord((mainIdea ?? '').replace(/\s+/g, ' ').trim());
}
