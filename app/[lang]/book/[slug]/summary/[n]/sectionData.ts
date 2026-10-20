import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicSummarySection } from '@/api/endpoints/public';
import { isRightsBlockedError } from '@/lib/errors';
import { pickSummaryVersion, summaryPlainText } from '@/lib/seo/book-summary';
import { handleContentFailure } from '@/lib/utils/content-failure';
import type { BookOverview } from '@/types/api-schema';
import { assertOverviewCarriesSummaryCount, pickSectionLinks } from '../summaryData';

/** Один запрос раздела на рендер: его читают и `generateMetadata`, и сама страница. */
export const getCachedSummarySection = cache((versionId: string, n: number) =>
  getPublicSummarySection(versionId, n)
);

/**
 * Версия языка страницы и её раздел с номером `n` - или `notFound()` (F04-3, `product.md` §3).
 *
 * 451 - раздел закрыт окончённой претензией на весь мир: на кэшируемой странице это «страницы
 * нет», а не поломка, как у анализа (одно правило правового отказа на сайт - `isRightsBlockedError`). Блок по стране закрывает middleware.
 * Неизвестное (пропало поле из ответа) - отказ, а не «раздела нет»: схема фронта написана руками.
 */
export async function loadSectionOrNotFound(
  book: BookOverview,
  supportedLang: string,
  slug: string,
  n: number
) {
  assertOverviewCarriesSummaryCount(book, supportedLang, slug);

  // Раздела без страницы `/summary` нет (§3): версия - та же, что у пересказа.
  const version = pickSummaryVersion(book, supportedLang);
  if (!version) notFound();

  const section = await getCachedSummarySection(version.id, n).catch((error: unknown) =>
    isRightsBlockedError(error) ? notFound() : handleContentFailure(error, notFound)
  );

  if (!section) notFound();
  if (
    typeof section.text !== 'string' ||
    typeof section.title !== 'string' ||
    !Array.isArray(section.sections)
  ) {
    throw new Error(`Summary section ${n} of version "${version.id}" has an unexpected shape`);
  }
  const plainText = summaryPlainText(section.text);
  if (!plainText) notFound();

  return { version, section, plainText, sections: pickSectionLinks(section.sections) };
}
