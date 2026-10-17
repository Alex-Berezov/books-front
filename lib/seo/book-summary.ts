import { buildIndexableAlternates } from '@/lib/seo/hreflang-alternates';
import { summaryPath, versionHasSummary } from '@/lib/seo/summary-path';
import { buildLangUrl } from '@/lib/seo/urls';
import { htmlToPlainText, truncateAtWord } from '@/lib/utils/html-text';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';
import type { BookOverview, VersionPreview } from '@/types/api-schema';

/**
 * Страница пересказа книги - `/{lang}/book/{slug}/summary` (решение владельца 17.10.2026).
 * Правила выбора версии, кластера hreflang и времени чтения - здесь, одни на страницу
 * пересказа, кнопку на странице книги и карту сайта: разойдись они - кнопка или карта
 * вели бы на 404.
 */

export { summaryPath, versionHasSummary };

/**
 * Версия, чей пересказ показывает страница языка `lang`: версия **этого языка** с пересказом.
 * Версия на язык у книги одна (`@@unique([bookId, language])` на бэкенде), обзор отдаёт только
 * опубликованные. Отката на другой язык нет: пересказ на чужом языке под `/ru` - не та страница,
 * которую обещает адрес. Нет такой версии - `null`, страница отвечает 404, кнопки нет.
 */
export function pickSummaryVersion(
  book: Pick<BookOverview, 'versions'>,
  lang: string
): VersionPreview | null {
  return book.versions?.find((v) => v.language === lang && versionHasSummary(v)) ?? null;
}

/** Версия в том виде, в каком её отдают и обзор книги, и список книг (карта сайта). */
type SummaryAlternateVersion = {
  language?: string;
  slug?: string | null;
  _count?: { summaries: number };
};

/**
 * Кластер hreflang страницы пересказа: только языки, где пересказ есть. Ссылка на язык без
 * пересказа вела бы в 404 и обесценивала весь кластер. Один вызов и для страницы, и для карты
 * сайта: карта передаёт свой построитель адреса от базы файла.
 */
export function buildSummaryAlternates(
  versions: readonly SummaryAlternateVersion[] | undefined,
  href: (language: string, slug: string) => string = (language, slug) =>
    buildLangUrl(language, summaryPath(slug))
): Record<string, string> | undefined {
  return buildIndexableAlternates(
    (versions ?? []).map((v) => ({
      language: v.language ?? '',
      slug: v.slug ?? '',
      linkable: Boolean(v.language) && versionHasSummary(v),
    })),
    href
  );
}

/**
 * Видимый текст пересказа - после того же санитайзера, что выводит его на страницу: скрипт или
 * другой выброшенный санитайзером тег текстом не считается.
 */
export function summaryPlainText(html: string): string {
  return htmlToPlainText(sanitizeRichHtml(html));
}

/** Заголовки разделов - часть оглавления, а не описания: без них описание начинается с сюжета. */
const HEADINGS = /<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>/gi;

/** Описание страницы пересказа: начало текста без заголовков, не длиннее 160 знаков. */
export function describeSummary(html: string): string | undefined {
  return truncateAtWord(htmlToPlainText(sanitizeRichHtml(html).replace(HEADINGS, ' ')));
}

/** Скорость чтения для оценки «N мин» - средняя для взрослого читателя прозы. */
const WORDS_PER_MINUTE = 230;

/** Минуты чтения пересказа, не меньше одной; пустой текст - `0`. */
export function readingMinutes(plainText: string): number {
  const words = plainText ? plainText.split(' ').filter(Boolean).length : 0;
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
