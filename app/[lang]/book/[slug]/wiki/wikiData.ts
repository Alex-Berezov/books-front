import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicBookWorld, getPublicBookWorldEntity } from '@/api/endpoints/public';
import { getPublicAudioChaptersForPage } from '@/api/endpoints/public-audio';
import { isRightsBlockedError } from '@/lib/errors';
import { versionHasAnalysis } from '@/lib/seo/analysis-path';
import { isWorldEntityKey, pickWorldPageVersion } from '@/lib/seo/book-world';
import { handleContentFailure } from '@/lib/utils/content-failure';
import { logError } from '@/lib/utils/log-error';
import type { BookOverview, BookWorldEntitySummary, VersionPreview } from '@/types/api-schema';
import { getCachedBookAnalysis } from '../analysis/analysisData';
import { assertOverviewCarriesCount } from '../overviewShape';

/** Один запрос списка мира на рендер: его читают и `generateMetadata`, и сама страница. */
export const getCachedBookWorld = cache((versionId: string) => getPublicBookWorld(versionId));

export const getCachedBookWorldEntity = cache((versionId: string, key: string) =>
  getPublicBookWorldEntity(versionId, key)
);

/**
 * Номера аудиоглав версии: «Слушать» у сцены ставится только на главу с тем же номером, которая есть
 * (`batches.md` F08-3, решение арбитра Q6). Только первая страница по `AUDIO_CHAPTERS_PAGE_LIMIT` - ровно столько глав грузит плеер, дальше ссылка вела бы туда, куда он не откроет; страна «неизвестна» - ответ ложится
 * в общий кэш. Отказ ручки - аудио не подтверждено, ссылок нет: страница от этого не ломается (блок
 * деградирует по частям), но отказ виден в журнале.
 */
export const getCachedAudioChapterNumbers = cache(async (audioVersionId: string) => {
  const items = await getPublicAudioChaptersForPage(audioVersionId).catch((error: unknown) => {
    logError('Error loading audio chapters for book world scenes:', error);
    return null;
  });
  return new Set((items ?? []).map((c) => c.number));
});

/**
 * Анализ версии для запасных имён, карты отношений и якоря «Анализ: темы»; запрос - только когда
 * у версии есть анализ по счётчику обзора (`versionHasAnalysis`), как ссылка на него. Отсутствие
 * или отказ - `null`. Отказ - не 404: блок деградирует, страница остаётся, но отказ виден в журнале.
 */
export const getCachedAnalysisOrNull = cache((versionId: string) =>
  getCachedBookAnalysis(versionId)
    .then((analysis) => analysis ?? null)
    .catch((error: unknown) => {
      logError('Error loading book analysis for book world:', error);
      return null;
    })
);

/** Анализ версии или `null` (нет анализа по счётчику обзора, отказ - в журнале). */
export const analysisOf = (version: VersionPreview) =>
  versionHasAnalysis(version) ? getCachedAnalysisOrNull(version.id) : Promise.resolve(null);

/**
 * Герои общей страницы мира (`product.md` §4 п.4): публичные сущности типа `character` - только
 * список карточек. Существование страницы - по любой публичной сущности (§4, как карта сайта,
 * `_count.worldEntities` и кластер hreflang): иначе ссылки карты вели бы в 404.
 */
export function worldCharacters(
  entities: readonly BookWorldEntitySummary[]
): BookWorldEntitySummary[] {
  return entities.filter((e) => e.type === 'character');
}

/** Правовой отказ ручки - тоже «страницы нет» (как у анализа: на кэшируемой странице это не 5xx). */
const isClosed = isRightsBlockedError;

/**
 * Версия языка страницы, публичный список её мира и герои - или `notFound()` (`product.md` §4: нет ни
 * одной публичной сущности - страницы нет; есть сущности, но не герои - страница без раздела героев). Пропавшее поле ответа - отказ, а не «мира нет»: схема фронта
 * написана руками, и сужение ответа на бэкенде иначе отправило бы раздел в кэшируемый 404.
 */
export async function loadWorldOrNotFound(book: BookOverview, lang: string, slug: string) {
  assertOverviewCarriesCount(book, lang, slug, 'worldEntities', 'world entity');
  const version = pickWorldPageVersion(book, lang);
  if (!version) notFound();

  // Список и анализ независимы - одним заходом.
  const [world, analysis] = await Promise.all([
    getCachedBookWorld(version.id).catch((error: unknown) =>
      isClosed(error) ? notFound() : handleContentFailure(error, notFound)
    ),
    analysisOf(version),
  ]);
  if (
    !world ||
    !Array.isArray(world.entities) ||
    !Array.isArray(world.alternates) ||
    !Array.isArray(world.places)
  ) {
    throw new Error(`World of version "${version.id}" carries no entities, alternates or places`);
  }
  if (world.entities.length === 0) notFound();

  return { version, world, characters: worldCharacters(world.entities), analysis };
}

/**
 * Версия, публичный список и сущность - или `notFound()`. Ключ проверяется регэкспом до запроса
 * (`tech.md` §6); 404 ручки - страницы нет (нет ядра, не прочитана, скрыта).
 */
export async function loadWorldEntityOrNotFound(
  book: BookOverview,
  lang: string,
  slug: string,
  key: string
) {
  if (!isWorldEntityKey(key)) notFound();
  assertOverviewCarriesCount(book, lang, slug, 'worldEntities', 'world entity');
  const version = pickWorldPageVersion(book, lang);
  if (!version) notFound();

  // Сущность, список (соседи и ссылки на страницы героев), анализ (запасные имена, якорь тем)
  // и аудиоглавы («Слушать» у сцен) независимы - одним заходом. Без списка страница остаётся,
  // ссылок нет.
  const audioVersionId = book.versionIds?.audio;
  const [detail, list, analysis, audioChapters] = await Promise.all([
    getCachedBookWorldEntity(version.id, key).catch((error: unknown) =>
      isClosed(error) ? notFound() : handleContentFailure(error, notFound)
    ),
    getCachedBookWorld(version.id).catch((error: unknown) => {
      logError('Error loading book world list for entity page:', error);
      return null;
    }),
    analysisOf(version),
    audioVersionId ? getCachedAudioChapterNumbers(audioVersionId) : new Set<number>(),
  ]);
  if (
    !detail ||
    !detail.entity ||
    !Array.isArray(detail.chapterNumbers) ||
    !Array.isArray(detail.alternates)
  ) {
    throw new Error(`World entity "${key}" of version "${version.id}" has an unexpected shape`);
  }
  return { version, detail, entities: list?.entities ?? [], analysis, audioChapters };
}
