import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  buildSummaryAlternates,
  describeSummaryPage,
  pickSummaryVersion,
  summaryPath,
} from '@/lib/seo/book-summary';
import { noteDegraded } from '@/lib/seo/degraded';
import { robotsHasNoindex } from '@/lib/seo/robots-noindex';
import { buildLangUrl } from '@/lib/seo/urls';
import { isNotFoundError } from '@/lib/utils/content-failure';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { getCachedBookOverview, getCachedBookSeo } from '../bookData';
import { getCachedBookSummary } from './summaryData';

const NOINDEX = { index: false, follow: true } as const;

/**
 * Мета страницы пересказа: свой title и описание из текста, canonical на себя, hreflang только
 * языков с пересказом. Книга закрыта редактором от индекса - пересказ закрыт вместе с ней.
 */
export async function buildSummaryMetadata(
  supportedLang: SupportedLang,
  slug: string
): Promise<Metadata> {
  const dict = getDictionary(supportedLang);

  try {
    const [book, bookSeo] = await Promise.all([
      getCachedBookOverview(supportedLang, slug),
      getCachedBookSeo(supportedLang, slug),
    ]);
    const version = book ? pickSummaryVersion(book, supportedLang) : null;
    const summary = version ? await getCachedBookSummary(version.id) : null;
    if (!book || !version || !summary) return { robots: NOINDEX };

    const title = version.title || book.title;
    const metaTitle = dict.book.summaryMetaTitle.replace('{title}', title);
    // Есть очень краткий - описание из него (F04 `product.md` §4): это выжимка всей книги.
    const description = describeSummaryPage(summary);
    const canonical = buildLangUrl(supportedLang, summaryPath(book.slug || slug));
    const cover = book.coverUrl;
    // Редактор закрыл книгу от индекса - пересказ с её сюжетом закрыт вместе с ней.
    const bookClosed = robotsHasNoindex(bookSeo.meta.robots);

    return {
      title: metaTitle,
      description,
      ...(bookClosed ? { robots: NOINDEX } : {}),
      alternates: {
        canonical,
        languages: bookClosed ? undefined : buildSummaryAlternates(book.versions),
      },
      openGraph: {
        title: metaTitle,
        description,
        type: 'article',
        url: canonical,
        locale: supportedLang,
        images: cover ? [{ url: cover, alt: version.coverAlt || title }] : undefined,
      },
      twitter: {
        card: 'summary',
        title: metaTitle,
        description,
      },
    };
  } catch (error) {
    // 404 - ответ: книги или пересказа нет, тело страницы придёт к тому же выводу.
    // Остальное - отказ транспорта: угаданный `noindex` на живом пересказе держался бы
    // неделями, 5xx поисковик чинит на следующем обходе (как у страницы книги).
    if (isNotFoundError(error)) return { robots: NOINDEX };
    noteDegraded({
      surface: 'book-summary',
      reason: 'bundle-unreadable',
      lang: supportedLang,
      slug,
      outcome: 'threw-5xx',
    });
    throw error;
  }
}
