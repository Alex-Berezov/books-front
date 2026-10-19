import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { buildEditionNotesRows } from '@/components/public/books/EditionNotes/editionNotesRows';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { hasText } from '@/lib/book-analysis/format';
import { getAnalysisStrings } from '@/lib/i18n/analysisStrings';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { buildAnalysisArticleJsonLd } from '@/lib/seo/analysis-jsonld';
import { analysisPath } from '@/lib/seo/book-analysis';
import { pickSummaryVersion, summaryPath } from '@/lib/seo/book-summary';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { resolveAuthorHref } from '../authorHref';
import { BookSectionNav, buildBookSectionNavItems } from '../BookSectionNav';
import { BookSubpageHero } from '../BookSubpageHero';
import { RelatedBooksSection } from '../RelatedBooksSection';
import styles from './analysis.module.scss';
import { ANALYSIS_ANCHORS } from './analysisAnchors';
import { FactActions, FactsCard, Paragraphs, Section, type ChapterLinker } from './AnalysisBlocks';
import { loadAnalysisOrNotFound } from './analysisData';
import { buildAnalysisMetadata } from './analysisMetadata';
import { AnalysisSections } from './AnalysisSections';
import { readerChapterHref } from '../read/chapterParam';
import { SummaryMoreBlocks } from '../summary/SummaryMoreBlocks';

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export const revalidate = 300;

const analysisUrl = (lang: string) => (bookSlug: string) => `/${lang}${analysisPath(bookSlug)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  return buildAnalysisMetadata(lang as SupportedLang, slug);
}

/**
 * Страница «Разбор и анализ» книги (F03, D1): серверный рендер, индексируется. Верх страницы -
 * пачка F03-2 (`product.md` §3, блоки 1-12 и 21); нижние блоки §13-§20 добавляет F03-3.
 * Сюжет здесь не пересказывается (§1.3) - для него есть ссылка на пересказ.
 */
export default async function BookAnalysisPage({ params }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  const book = await resolveBookForSubroute(supportedLang, slug, analysisUrl(lang));

  // 307, а не 308, как у пересказа (решение арбитра 06.09.2026).
  if (book.slug && book.slug !== slug) {
    redirect(analysisUrl(lang)(book.slug));
  }

  const { version, analysis } = await loadAnalysisOrNotFound(book, supportedLang, slug);

  const dict = getDictionary(supportedLang);
  const t = dict.book;
  const analysisT = getAnalysisStrings(supportedLang);
  const bookSlug = book.slug || slug;
  const bookHref = `/${supportedLang}/book/${bookSlug}`;
  const title = version.title || book.title;
  const pageTitle = analysisT.analysisPageTitle.replace('{title}', title);
  const authorName = version.author || book.author || t.unknownAuthor;
  const authorHref = resolveAuthorHref(version.authorPageUrl, book.authorSlug ?? null, lang);
  const year = book.firstPublishedYear ? String(book.firstPublishedYear) : null;
  const read = book.versionIds?.text ? { href: `${bookHref}/read`, label: t.readFullBook } : null;
  const listen = book.versionIds?.audio
    ? { href: `${bookHref}/listen`, label: t.listenAudiobook }
    : null;
  const summary =
    pickSummaryVersion(book, supportedLang) !== null
      ? { href: `/${supportedLang}${summaryPath(bookSlug)}`, label: t.summary }
      : null;

  // Ссылка «глава N» - только на главу, которая есть в версии (§1.6); у версии без текста номеров нет.
  const chapterNumbers = new Set(analysis.chapterNumbers);
  const linker: ChapterLinker = {
    label: (n) => analysisT.analysisChapter.replace('{n}', String(n)),
    href: (n) => (chapterNumbers.has(n) ? readerChapterHref(bookHref, n) : null),
  };

  const navItems = buildBookSectionNavItems({
    lang: supportedLang,
    bookSlug,
    hasText: Boolean(read),
    hasAudio: Boolean(listen),
    hasSummary: Boolean(summary),
    // Пункт этой страницы - активный, он есть всегда; на других страницах книги пункт - по счётчику.
    hasAnalysis: true,
    labels: {
      book: t.bookNavBook,
      read: t.read,
      listen: t.listen,
      summary: t.summary,
      analysis: t.analysis,
    },
  });

  // Карточка произведения (§4): порядок строк - как в спецификации; год первой публикации и язык
  // оригинала - из данных версии (то же правило, что блок «Об издании»), остальное - из анализа.
  const facts = analysis.facts ?? {};
  const editionRows = buildEditionNotesRows(
    {
      version,
      firstPublishedYear: book.firstPublishedYear,
      shownTitle: title,
      lang: supportedLang,
    },
    {
      firstPublished: t.editionFirstPublished,
      originalLanguage: t.editionOriginalLanguage,
      originalTitle: t.editionOriginalTitle,
      translator: t.editionTranslator,
    }
  );
  const editionValue = (label: string) => editionRows.find((r) => r.label === label)?.value;
  const factRows = [
    { label: t.summaryGenre, value: facts.genre },
    { label: analysisT.analysisFactMovement, value: facts.movement },
    { label: analysisT.analysisFactWrittenYears, value: facts.writtenYears },
    { label: t.editionFirstPublished, value: editionValue(t.editionFirstPublished) },
    { label: analysisT.analysisFactSettingPlace, value: facts.settingPlace },
    { label: analysisT.analysisFactSettingTime, value: facts.settingTime },
    { label: analysisT.analysisFactNarrator, value: facts.narrator },
    { label: analysisT.analysisFactStructure, value: facts.structure },
    { label: t.editionOriginalLanguage, value: editionValue(t.editionOriginalLanguage) },
  ].filter((row): row is { label: string; value: string } => hasText(row.value));

  const jsonLd = buildAnalysisArticleJsonLd({
    lang: supportedLang,
    pageSlug: bookSlug,
    bookSchemaSlug: version.slug || version.id,
    headline: pageTitle,
    editorialTeam: t.editorialTeam,
    createdAt: analysis.createdAt,
    updatedAt: analysis.updatedAt,
    coverUrl: book.coverUrl,
  });

  return (
    <div className={styles.analysisPage}>
      <div className={styles.container}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />

        <Breadcrumbs
          items={[
            { label: dict.breadcrumb.home, href: `/${supportedLang}` },
            { label: title, href: bookHref },
            { label: t.analysis },
          ]}
        />

        {/* Жанр - в карточке произведения из анализа; в шапке его нет: два разных жанра на одной странице (§4). */}
        <BookSubpageHero
          bookHref={bookHref}
          coverUrl={book.coverUrl}
          kicker={analysisT.analysisPageSubtitle}
          title={pageTitle}
          byLabel={t.by}
          authorName={authorName}
          authorHref={authorHref}
          meta={year ? [{ key: 'year', content: year }] : []}
        />

        <BookSectionNav items={navItems} active="analysis" ariaLabel={t.bookNavLabel} />

        <div className={styles.content}>
          <FactsCard
            id={ANALYSIS_ANCHORS.facts}
            title={analysisT.analysisFactsTitle}
            rows={factRows}
            actions={<FactActions read={read} listen={listen} summary={summary} />}
          />

          <Section id={ANALYSIS_ANCHORS.mainIdea} title={analysisT.analysisMainIdeaTitle}>
            <div className={styles.mainIdea}>
              <Paragraphs text={analysis.mainIdea} />
            </div>
          </Section>

          <AnalysisSections
            analysis={analysis}
            linker={linker}
            strings={analysisT}
            tocTitle={dict.common.tableOfContents}
          />

          {/* «Дальше» (§3 п.21) - тот же блок, что у пересказа; «Узнать больше» здесь не нужен. */}
          <SummaryMoreBlocks
            exploreTitle=""
            exploreLinks={[]}
            continueTitle={t.summaryContinueTitle}
            read={read}
            listen={listen}
          />
        </div>

        <Suspense fallback={null}>
          <RelatedBooksSection lang={supportedLang} slug={bookSlug} variant="book" />
        </Suspense>
      </div>
    </div>
  );
}
