import { Suspense } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { redirect } from 'next/navigation';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { RichTextContent } from '@/components/common/RichTextContent';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { analysisPath, pickAnalysisVersion } from '@/lib/seo/book-analysis';
import { readingMinutes, summaryPath } from '@/lib/seo/book-summary';
import { buildSummaryArticleJsonLd } from '@/lib/seo/summary-jsonld';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { formatLongDateUtc } from '@/lib/utils/date';
import { anchorHeadings } from '@/lib/utils/heading-anchors';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { resolveAuthorHref } from '../authorHref';
import { BookSectionNav, buildBookSectionNavItems } from '../BookSectionNav';
import { BookSubpageHero } from '../BookSubpageHero';
import { RelatedBooksSection } from '../RelatedBooksSection';
import styles from './summary.module.scss';
import { loadSummaryOrNotFound } from './summaryData';
import { buildSummaryMetadata } from './summaryMetadata';
import { buildExploreLinks, SummaryMoreBlocks } from './SummaryMoreBlocks';
import { SummarySidebar } from './SummarySidebar';

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export const revalidate = 300;

/** Префикс якорей разделов пересказа: тот же у оглавления и у `RichTextContent`. */
const SUMMARY_ANCHOR_PREFIX = 'part';

/** С какого числа разделов `h2` в сайдбаре появляется оглавление. */
const SUMMARY_TOC_MIN_SECTIONS = 2;

/**
 * Заголовок первого уровня у страницы один - название пересказа в шапке. `h1` из редактора
 * понижается до `h2`: иначе на индексируемой странице два `h1`, а раздел выпал бы из оглавления.
 */
const demoteH1 = (safeHtml: string) => safeHtml.replace(/<(\/?)h1(?=[\s>])/gi, '<$1h2');

const anchorSummaryHeadings = (safeHtml: string) =>
  anchorHeadings(demoteH1(safeHtml), SUMMARY_ANCHOR_PREFIX, 'h2').html;

const summaryUrl = (lang: string) => (bookSlug: string) => `/${lang}${summaryPath(bookSlug)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  return buildSummaryMetadata(lang as SupportedLang, slug);
}

/**
 * Страница пересказа книги (решение владельца 17.10.2026): серверный рендер, индексируется.
 * Только сюжет - разбор и анализ живут отдельным разделом, поля `analysis`/`themes` здесь
 * не выводятся.
 */
export default async function BookSummaryPage({ params }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  const book = await resolveBookForSubroute(supportedLang, slug, summaryUrl(lang));

  // 307, а не 308, как у читалки и плеера (решение арбитра 06.09.2026).
  if (book.slug && book.slug !== slug) {
    redirect(summaryUrl(lang)(book.slug));
  }

  const { version, summary, plainText } = await loadSummaryOrNotFound(book, supportedLang, slug);

  const dict = getDictionary(supportedLang);
  const bookSlug = book.slug || slug;
  const bookHref = `/${supportedLang}/book/${bookSlug}`;
  const title = version.title || book.title;
  const pageTitle = dict.book.summaryPageTitle.replace('{title}', title);
  const readingTime = dict.book.summaryReadingTime.replace(
    '{minutes}',
    String(readingMinutes(plainText))
  );
  const authorName = version.author || book.author || dict.book.unknownAuthor;
  const authorHref = resolveAuthorHref(version.authorPageUrl, book.authorSlug ?? null, lang);
  const year = book.firstPublishedYear ? String(book.firstPublishedYear) : null;
  const genre = book.primaryCategory?.name ?? null;
  const readHref = book.versionIds?.text ? `${bookHref}/read` : null;
  const listenHref = book.versionIds?.audio ? `${bookHref}/listen` : null;
  const analysisHref =
    pickAnalysisVersion(book, supportedLang) !== null
      ? `/${supportedLang}${analysisPath(bookSlug)}`
      : null;

  const { anchors } = anchorHeadings(
    demoteH1(sanitizeRichHtml(summary.summary)),
    SUMMARY_ANCHOR_PREFIX,
    'h2'
  );

  const navItems = buildBookSectionNavItems({
    lang: supportedLang,
    bookSlug,
    hasText: Boolean(readHref),
    hasAudio: Boolean(listenHref),
    hasSummary: true,
    hasAnalysis: Boolean(analysisHref),
    labels: {
      book: dict.book.bookNavBook,
      read: dict.book.read,
      listen: dict.book.listen,
      summary: dict.book.summary,
      analysis: dict.book.analysis,
    },
  });

  const exploreLinks = buildExploreLinks(bookHref, version, analysisHref, {
    about: dict.book.summaryExploreAbout,
    analysis: dict.book.analysisExploreLink,
    characters: dict.book.mainCharacters,
    symbols: dict.book.symbols,
    quotes: dict.book.quotes,
  });

  // Разметка и подпись «Обновлено» - только при известной дате изменения пересказа.
  const updatedAt = new Date(summary.updatedAt);
  const updatedDate = Number.isNaN(updatedAt.getTime())
    ? null
    : formatLongDateUtc(updatedAt, supportedLang);
  const jsonLd = updatedDate
    ? buildSummaryArticleJsonLd({
        lang: supportedLang,
        bookSlug,
        bookTitle: title,
        headline: pageTitle,
        editorialTeam: dict.book.editorialTeam,
        updatedAt: summary.updatedAt,
      })
    : null;

  return (
    <div className={styles.summaryPage}>
      <div className={styles.container}>
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
          />
        )}

        <Breadcrumbs
          items={[
            { label: dict.breadcrumb.home, href: `/${supportedLang}` },
            { label: dict.taxonomy.allBooks, href: `/${supportedLang}/catalog` },
            { label: title, href: bookHref },
            { label: dict.book.summary },
          ]}
        />

        <BookSubpageHero
          bookHref={bookHref}
          coverUrl={book.coverUrl}
          kicker={dict.book.summaryPageSubtitle}
          title={pageTitle}
          byLabel={dict.book.by}
          authorName={authorName}
          authorHref={authorHref}
          meta={[
            ...(year ? [{ key: 'year', content: year }] : []),
            ...(genre ? [{ key: 'genre', content: genre }] : []),
            {
              key: 'reading',
              content: (
                <>
                  <Clock size={14} aria-hidden="true" />
                  {readingTime}
                </>
              ),
            },
          ]}
        />

        <BookSectionNav items={navItems} active="summary" ariaLabel={dict.book.bookNavLabel} />

        <div className={styles.layout}>
          <article className={styles.main}>
            <p className={styles.spoiler} role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              {dict.book.summarySpoilerWarning}
            </p>
            <EditorialByline
              lang={supportedLang}
              teamLabel={dict.book.editorialTeam}
              dateText={
                updatedDate ? dict.book.updatedOn.replace('{date}', updatedDate) : undefined
              }
            />
            <RichTextContent
              html={summary.summary}
              transformSafeHtml={anchorSummaryHeadings}
              className={styles.text}
            />
          </article>

          <SummarySidebar
            infoTitle={dict.book.summaryBookInfo}
            facts={[
              { label: dict.book.author, value: authorName },
              ...(year ? [{ label: dict.book.publicationYear, value: year }] : []),
              ...(genre ? [{ label: dict.book.summaryGenre, value: genre }] : []),
              { label: dict.book.languageLabel, value: supportedLang.toUpperCase() },
              { label: dict.book.summaryReadingTimeLabel, value: readingTime },
            ]}
            tocTitle={dict.common.tableOfContents}
            toc={anchors.length >= SUMMARY_TOC_MIN_SECTIONS ? anchors : []}
          />
        </div>

        <SummaryMoreBlocks
          exploreTitle={dict.book.summaryExploreTitle}
          exploreLinks={exploreLinks}
          continueTitle={dict.book.summaryContinueTitle}
          read={readHref ? { href: readHref, label: dict.book.readFullBook } : null}
          listen={listenHref ? { href: listenHref, label: dict.book.listenAudiobook } : null}
        />

        <Suspense fallback={null}>
          <RelatedBooksSection lang={supportedLang} slug={bookSlug} variant="summary" />
        </Suspense>

        {version.faq && version.faq.length > 0 && (
          // Разметка FAQPage уже стоит на странице книги с теми же вопросами: второй раз её не ставим.
          <FaqBlock items={version.faq} title={dict.book.faqTitle} showJsonLd={false} />
        )}
      </div>
    </div>
  );
}
