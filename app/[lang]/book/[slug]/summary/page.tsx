import { Suspense } from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { redirect } from 'next/navigation';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { RichTextContent } from '@/components/common/RichTextContent';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { getAnalysisStrings } from '@/lib/i18n/analysisStrings';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getSummaryStrings } from '@/lib/i18n/summaryStrings';
import { summaryPath } from '@/lib/seo/book-summary';
import { buildSummaryArticleJsonLd } from '@/lib/seo/summary-jsonld';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { formatLongDateUtc } from '@/lib/utils/date';
import { anchorHeadings, demoteH1 } from '@/lib/utils/heading-anchors';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import { readingMinutes } from '@/lib/utils/reading-time';
import { sanitizeRichHtml } from '@/lib/utils/rich-html';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { BookSectionNav } from '../BookSectionNav';
import { BookSubpageHero } from '../BookSubpageHero';
import { RelatedBooksSection } from '../RelatedBooksSection';
import styles from './summary.module.scss';
import { buildSummaryBookContext } from './summaryBookContext';
import { SummaryBrief } from './SummaryBrief';
import { loadSummaryOrNotFound } from './summaryData';
import { buildSummaryMetadata } from './summaryMetadata';
import { buildExploreLinks, SummaryMoreBlocks } from './SummaryMoreBlocks';
import { SummarySectionsToc } from './SummarySectionsToc';
import { SummarySidebar } from './SummarySidebar';

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export const revalidate = 300;

/** Префикс якорей разделов пересказа: тот же у оглавления и у `RichTextContent`. */
const SUMMARY_ANCHOR_PREFIX = 'part';

/** С какого числа разделов `h2` в сайдбаре появляется оглавление. */
const SUMMARY_TOC_MIN_SECTIONS = 2;

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

  const { version, summary, plainText, brief, sections } = await loadSummaryOrNotFound(
    book,
    supportedLang,
    slug
  );

  const dict = getDictionary(supportedLang);
  const summaryStrings = getSummaryStrings(supportedLang);
  const {
    bookSlug,
    bookHref,
    title,
    authorName,
    authorHref,
    year,
    genre,
    readHref,
    listenHref,
    analysisHref,
    navItems,
  } = buildSummaryBookContext({ book, version, lang: supportedLang, slug, dict });
  const pageTitle = dict.book.summaryPageTitle.replace('{title}', title);
  const readingTime = dict.book.summaryReadingTime.replace(
    '{minutes}',
    String(readingMinutes(plainText))
  );

  const { anchors } = anchorHeadings(
    demoteH1(sanitizeRichHtml(summary.summary)),
    SUMMARY_ANCHOR_PREFIX,
    'h2'
  );

  const exploreLinks = buildExploreLinks(bookHref, version, analysisHref, {
    about: dict.book.summaryExploreAbout,
    analysis: getAnalysisStrings(supportedLang).analysisExploreLink,
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
            {brief && (
              <SummaryBrief
                html={brief.html}
                plainText={brief.plainText}
                title={summaryStrings.summaryBriefTitle}
                readingTimeTemplate={dict.book.summaryReadingTime}
              />
            )}
            <SummarySectionsToc
              lang={supportedLang}
              bookSlug={bookSlug}
              title={summaryStrings.summarySectionsTitle}
              sections={sections}
            />
            {/* Над полным - только когда выше есть другой блок (`product.md` §4 п.5). */}
            {(brief || sections.length > 0) && (
              <h2 className={styles.blockTitle}>{summaryStrings.summaryFullTitle}</h2>
            )}
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
