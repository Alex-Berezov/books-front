import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicBookSummary, getPublicSummarySections } from '@/api/endpoints/public';
import { pickBrief, pickSummaryVersion, summaryPlainText } from '@/lib/seo/book-summary';
import { noteDegraded } from '@/lib/seo/degraded';
import { handleContentFailure } from '@/lib/utils/content-failure';
import { logError } from '@/lib/utils/log-error';
import { parseOrdinal } from '@/lib/utils/ordinal-param';
import type { BookOverview, VersionPreview } from '@/types/api-schema';

/** Один запрос пересказа на рендер: его читают и `generateMetadata`, и сама страница. */
export const getCachedBookSummary = cache((versionId: string) => getPublicBookSummary(versionId));

/** Пункт оглавления разделов: номер (адрес `/summary/{n}`) и название. */
export type SummarySectionLink = { number: number; title: string };

/**
 * Пункты оглавления той формы, из которой строятся ссылки: элемент без целого номера или без
 * названия отбрасывается - иначе на индексируемой странице появилась бы ссылка `/summary/undefined`.
 */
export function pickSectionLinks(items: unknown): SummarySectionLink[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<number>();
  return items.flatMap((item: Partial<SummarySectionLink> | null) => {
    // Номер - по правилу адреса (`parseOrdinal`): `0`, отрицательный или повтор ссылкой не станут.
    const n = Number.isInteger(item?.number) ? parseOrdinal(String(item?.number)) : null;
    if (n === null || typeof item?.title !== 'string' || seen.has(n)) return [];
    seen.add(n);
    return [{ number: n, title: item.title }];
  });
}

/**
 * 🔴 Обзор книги без полей, по которым решается «есть ли пересказ», - отказ, а не ответ «пересказа
 * нет». Схема фронта написана руками: сузят белый список обзора на бэкенде - и без этой проверки
 * весь раздел ушёл бы в кэшируемый 404 при зелёных тестах (тот же довод был у старой страницы
 * `/summary/...`). Одна проверка на `/summary` и страницы его разделов (F04-3).
 */
export function assertOverviewCarriesSummaryCount(
  book: BookOverview,
  supportedLang: string,
  slug: string
): void {
  if (!Array.isArray(book.versions)) {
    throw new Error(`Book overview for "${slug}" carries no versions array`);
  }
  const langVersion = book.versions.find((v) => v.language === supportedLang);
  if (langVersion && typeof langVersion._count?.summaries !== 'number') {
    throw new Error(`Book overview for "${slug}" carries no summary count`);
  }
}

/**
 * Оглавление разделов (F04-3): запрос - только при счётчике открытых разделов в обзоре. Отказ или
 * не та форма - оглавления нет, страница пересказа открыта: оглавление - добавка, а не её суть.
 */
async function loadSummarySections(version: VersionPreview): Promise<SummarySectionLink[]> {
  const count = version._count?.summarySections;
  // Поля нет - неизвестность, а не «разделов нет»: страница открыта без оглавления, сигнал - в лог.
  if (typeof count !== 'number') {
    noteDegraded({
      surface: 'book-summary-sections-toc',
      reason: 'count-unreadable',
      slug: version.slug ?? undefined,
      outcome: 'dropped-block',
    });
    return [];
  }
  if (count < 1) return [];
  try {
    const list = await getPublicSummarySections(version.id);
    return pickSectionLinks(list?.sections);
  } catch (error) {
    logError('summary-sections', error);
    noteDegraded({
      surface: 'book-summary-sections-toc',
      reason: 'bundle-unreadable',
      slug: version.slug ?? undefined,
      outcome: 'dropped-block',
    });
    return [];
  }
}

/**
 * Версия языка страницы, её пересказ, его видимый текст, очень краткий пересказ (`null` - блока
 * нет) и оглавление разделов - или `notFound()`. Неизвестное (пропало прежнее поле из ответа) -
 * отказ, а не «пересказа нет».
 */
export async function loadSummaryOrNotFound(
  book: BookOverview,
  supportedLang: string,
  slug: string
) {
  assertOverviewCarriesSummaryCount(book, supportedLang, slug);

  const version = pickSummaryVersion(book, supportedLang);
  if (!version) notFound();

  const [summary, sections] = await Promise.all([
    getCachedBookSummary(version.id).catch((error) => handleContentFailure(error, notFound)),
    loadSummarySections(version),
  ]);
  if (!summary) notFound();

  // 🔴 Поле пропало из ответа (схема фронта написана руками) - отказ, а не «текста нет»: иначе
  // пересказ, который обзор уже подтвердил, ушёл бы в кэшируемый 404.
  if (typeof summary.summary !== 'string') {
    throw new Error(`Summary of version "${version.id}" carries no summary text`);
  }
  const plainText = summaryPlainText(summary.summary);
  if (!plainText) notFound();

  return { version, summary, plainText, brief: pickBrief(summary), sections };
}
