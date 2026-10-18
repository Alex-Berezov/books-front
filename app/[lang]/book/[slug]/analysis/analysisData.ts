import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicBookAnalysis } from '@/api/endpoints/public';
import { hasText } from '@/lib/book-analysis/format';
import { isRightsBlockedError } from '@/lib/errors';
import { pickAnalysisPageVersion } from '@/lib/seo/book-analysis';
import { handleContentFailure } from '@/lib/utils/content-failure';
import type { BookOverview } from '@/types/api-schema';

/** Один запрос анализа на рендер: его читают и `generateMetadata`, и сама страница. */
export const getCachedBookAnalysis = cache((versionId: string) => getPublicBookAnalysis(versionId));

/**
 * 451 - анализ закрыт блоком окончённой претензии на весь мир (F03, D7): серверный запрос идёт
 * со страной «неизвестна», и блок по стране его не закрывает. На кэшируемой странице это ответ
 * «страницы нет», а не поломка: через `handleContentFailure` он стал бы 5xx, и ISR продолжал бы
 * раздавать прежнюю, открытую версию страницы (решение арбитра `F03 | F03-2`). Правило правового
 * отказа - одно на сайт (`isRightsBlockedError`, им же живут читалка и плеер).
 */
export const isClaimClosedError = isRightsBlockedError;

/**
 * Версия языка страницы и её анализ - или `notFound()`. Неизвестное (пропало поле из ответа) -
 * отказ, а не «анализа нет»: схема фронта написана руками, и сужение ответа на бэкенде иначе
 * отправило бы весь раздел в кэшируемый 404 при зелёных тестах (как `summaryData.ts`).
 */
export async function loadAnalysisOrNotFound(
  book: BookOverview,
  supportedLang: string,
  slug: string
) {
  if (!Array.isArray(book.versions)) {
    throw new Error(`Book overview for "${slug}" carries no versions array`);
  }
  const langVersion = book.versions.find((v) => v.language === supportedLang);
  if (langVersion && typeof langVersion._count?.analyses !== 'number') {
    throw new Error(`Book overview for "${slug}" carries no analysis count`);
  }

  // Доступ - по версии языка и ответу ручки, а не по счётчику (`pickAnalysisPageVersion`).
  const version = pickAnalysisPageVersion(book, supportedLang);
  if (!version) notFound();

  const analysis = await getCachedBookAnalysis(version.id).catch((error: unknown) =>
    isClaimClosedError(error) ? notFound() : handleContentFailure(error, notFound)
  );
  // Без ядра ручка отдаёт анониму `null` - страницы нет (`product.md` §2).
  if (!analysis || analysis.hasCore !== true) notFound();

  if (!Array.isArray(analysis.chapterNumbers)) {
    throw new Error(`Analysis of version "${version.id}" carries no chapter numbers`);
  }
  // Ядро подтверждено бэкендом, а главной мысли нет - ответ не той формы, а не «анализа нет».
  if (!hasText(analysis.mainIdea)) {
    throw new Error(`Analysis of version "${version.id}" carries no main idea`);
  }

  return { version, analysis };
}
