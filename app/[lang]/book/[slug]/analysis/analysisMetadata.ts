import { getDictionary } from '@/lib/i18n/dictionaries';
import {
  analysisPath,
  buildAnalysisAlternates,
  describeAnalysis,
  pickAnalysisPageVersion,
} from '@/lib/seo/book-analysis';
import { noteDegraded } from '@/lib/seo/degraded';
import { buildLangUrl } from '@/lib/seo/urls';
import { isNotFoundError } from '@/lib/utils/content-failure';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { getCachedBookOverview, getCachedBookSeo } from '../bookData';
import { getCachedBookAnalysis, isClaimClosedError } from './analysisData';

const NOINDEX = { index: false, follow: true } as const;

/**
 * Мета страницы анализа (`product.md` §22): title «{Книга}: анализ и разбор — {Автор}», описание
 * из главной мысли, canonical на себя, hreflang только языков с анализом. Книга закрыта
 * редактором от индекса - анализ закрыт вместе с ней.
 */
export async function buildAnalysisMetadata(
  supportedLang: SupportedLang,
  slug: string
): Promise<Metadata> {
  const dict = getDictionary(supportedLang);

  try {
    const [book, bookSeo] = await Promise.all([
      getCachedBookOverview(supportedLang, slug),
      getCachedBookSeo(supportedLang, slug),
    ]);
    const version = book ? pickAnalysisPageVersion(book, supportedLang) : null;
    const analysis = version ? await getCachedBookAnalysis(version.id) : null;
    if (!book || !version || !analysis || analysis.hasCore !== true) return { robots: NOINDEX };

    const title = version.title || book.title;
    const author = version.author || book.author || dict.book.unknownAuthor;
    const metaTitle = dict.book.analysisMetaTitle
      .replace('{title}', title)
      .replace('{author}', author);
    const description = describeAnalysis(analysis.mainIdea);
    const canonical = buildLangUrl(supportedLang, analysisPath(book.slug || slug));
    const cover = book.coverUrl;
    const bookClosed = /noindex/i.test(bookSeo.meta.robots ?? '');
    const alternates = buildAnalysisAlternates(book.versions);

    return {
      title: metaTitle,
      description,
      ...(bookClosed ? { robots: NOINDEX } : {}),
      alternates: {
        canonical,
        languages: bookClosed ? undefined : ownClusterOrNone(alternates, supportedLang),
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
    // 404 и 451 (анализ закрыт окончённой претензией) - ответ: страницы нет, тело придёт
    // к тому же выводу. Остальное - отказ транспорта, 5xx (как у пересказа).
    if (isNotFoundError(error) || isClaimClosedError(error)) return { robots: NOINDEX };
    noteDegraded({
      surface: 'book-analysis',
      reason: 'bundle-unreadable',
      lang: supportedLang,
      slug,
      outcome: 'threw-5xx',
    });
    throw error;
  }
}

/**
 * Кластер hreflang - только если в нём есть сама страница. Счётчик языка страницы бывает 0 при
 * открытой странице (блок окончённой претензии по другой стране): кластер без себя - противоречивый
 * сигнал, лучше не отдавать его вовсе.
 */
function ownClusterOrNone(
  alternates: Record<string, string> | undefined,
  lang: string
): Record<string, string> | undefined {
  return alternates && alternates[lang] ? alternates : undefined;
}
