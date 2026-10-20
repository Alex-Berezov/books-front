import { cache } from 'react';
import { notFound } from 'next/navigation';
import { getPublicBookSummary } from '@/api/endpoints/public';
import { pickBrief, pickSummaryVersion, summaryPlainText } from '@/lib/seo/book-summary';
import { handleContentFailure } from '@/lib/utils/content-failure';
import type { BookOverview } from '@/types/api-schema';

/** Один запрос пересказа на рендер: его читают и `generateMetadata`, и сама страница. */
export const getCachedBookSummary = cache((versionId: string) => getPublicBookSummary(versionId));

/**
 * Версия языка страницы, её пересказ, его видимый текст и очень краткий пересказ (`null` - блока
 * нет) - или `notFound()`. Неизвестное (пропало прежнее поле из ответа) - отказ, а не «пересказа нет».
 */
export async function loadSummaryOrNotFound(
  book: BookOverview,
  supportedLang: string,
  slug: string
) {
  // 🔴 Отсутствие поля - отказ, а не ответ «пересказа нет». Схема фронта написана руками: сузят
  // белый список обзора на бэкенде - и без этой проверки весь раздел ушёл бы в кэшируемый 404
  // при зелёных тестах (тот же довод был у старой страницы `/summary/...`).
  if (!Array.isArray(book.versions)) {
    throw new Error(`Book overview for "${slug}" carries no versions array`);
  }
  const langVersion = book.versions.find((v) => v.language === supportedLang);
  if (langVersion && typeof langVersion._count?.summaries !== 'number') {
    throw new Error(`Book overview for "${slug}" carries no summary count`);
  }

  const version = pickSummaryVersion(book, supportedLang);
  if (!version) notFound();

  const summary = await getCachedBookSummary(version.id).catch((error) =>
    handleContentFailure(error, notFound)
  );
  if (!summary) notFound();

  // 🔴 Поле пропало из ответа (схема фронта написана руками) - отказ, а не «текста нет»: иначе
  // пересказ, который обзор уже подтвердил, ушёл бы в кэшируемый 404.
  if (typeof summary.summary !== 'string') {
    throw new Error(`Summary of version "${version.id}" carries no summary text`);
  }
  const plainText = summaryPlainText(summary.summary);
  if (!plainText) notFound();

  return { version, summary, plainText, brief: pickBrief(summary) };
}
