import { isRightsBlockedError } from '@/lib/errors';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getSummaryStrings } from '@/lib/i18n/summaryStrings';
import { describeSummary, pickSummaryVersion } from '@/lib/seo/book-summary';
import { noteDegraded } from '@/lib/seo/degraded';
import { buildIndexableAlternates } from '@/lib/seo/hreflang-alternates';
import { robotsHasNoindex } from '@/lib/seo/robots-noindex';
import { summarySectionPath } from '@/lib/seo/summary-path';
import { buildLangUrl } from '@/lib/seo/urls';
import { isNotFoundError } from '@/lib/utils/content-failure';
import { parseOrdinal } from '@/lib/utils/ordinal-param';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { getCachedSummarySection } from './sectionData';
import { getCachedBookOverview, getCachedBookSeo } from '../../bookData';

const NOINDEX = { index: false, follow: true } as const;

/** h1 раздела по формуле `product.md` §5а: «{Книга}: {раздел} — краткое содержание». */
export function summarySectionHeading(
  lang: SupportedLang,
  bookTitle: string,
  sectionTitle: string
) {
  // Подстановка функцией: `$&`, `$$` в названии - текст редакции, а не шаблон замены; и название
  // книги со словом `{section}` не подставляет в себя раздел.
  return getSummaryStrings(lang).summarySectionPageTitle.replace(
    /\{title\}|\{section\}/g,
    (token) => (token === '{title}' ? bookTitle : sectionTitle)
  );
}

/** Суффикс бренда title - тот же, что у title `/summary` (`summaryMetaTitle`, §5). */
function brandSuffix(summaryMetaTitle: string): string {
  const at = summaryMetaTitle.lastIndexOf(' | ');
  return at === -1 ? '' : summaryMetaTitle.slice(at);
}

/**
 * Мета страницы раздела (F04-3, `product.md` §5, §6): title - формула h1 с суффиксом бренда,
 * описание - начало текста раздела, canonical на себя, hreflang - только свой язык (T9: пары
 * «раздел ↔ раздел» между языками нет). Книга закрыта редактором от индекса - раздел тоже.
 */
export async function buildSectionMetadata(
  supportedLang: SupportedLang,
  slug: string,
  rawN: string
): Promise<Metadata> {
  const n = parseOrdinal(rawN);
  if (n === null) return { robots: NOINDEX };
  const dict = getDictionary(supportedLang);

  try {
    const [book, bookSeo] = await Promise.all([
      getCachedBookOverview(supportedLang, slug),
      getCachedBookSeo(supportedLang, slug),
    ]);
    const version = book ? pickSummaryVersion(book, supportedLang) : null;
    const section = version ? await getCachedSummarySection(version.id, n) : null;
    if (
      !book ||
      !version ||
      typeof section?.text !== 'string' ||
      typeof section.title !== 'string'
    ) {
      return { robots: NOINDEX };
    }

    const bookSlug = book.slug || slug;
    const heading = summarySectionHeading(
      supportedLang,
      version.title || book.title,
      section.title
    );
    const metaTitle = `${heading}${brandSuffix(dict.book.summaryMetaTitle)}`;
    const description = describeSummary(section.text);
    const href = (language: string, s: string) => buildLangUrl(language, summarySectionPath(s, n));
    const canonical = href(supportedLang, bookSlug);
    const bookClosed = robotsHasNoindex(bookSeo.meta.robots);

    return {
      title: metaTitle,
      description,
      ...(bookClosed ? { robots: NOINDEX } : {}),
      alternates: {
        canonical,
        // Один кандидат - язык страницы (решение арбитра `F04 | F04-3`): `x-default` на тот же адрес.
        languages: bookClosed
          ? undefined
          : buildIndexableAlternates(
              [{ language: supportedLang, slug: bookSlug, linkable: true }],
              href
            ),
      },
      openGraph: {
        title: metaTitle,
        description,
        type: 'article',
        url: canonical,
        locale: supportedLang,
        images: book.coverUrl
          ? [{ url: book.coverUrl, alt: version.coverAlt || version.title || book.title }]
          : undefined,
      },
      twitter: { card: 'summary', title: metaTitle, description },
    };
  } catch (error) {
    // 404 и 451 (раздел закрыт претензией на весь мир) - ответ: страницы нет. Остальное - 5xx.
    if (isNotFoundError(error) || isRightsBlockedError(error)) return { robots: NOINDEX };
    noteDegraded({
      surface: 'book-summary-section',
      reason: 'bundle-unreadable',
      lang: supportedLang,
      slug,
      outcome: 'threw-5xx',
    });
    throw error;
  }
}
