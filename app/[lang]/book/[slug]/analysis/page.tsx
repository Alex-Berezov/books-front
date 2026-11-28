import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { pickBookHeroes } from '@/lib/book-world/format';
import { getAnalysisStrings } from '@/lib/i18n/analysisStrings';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getWorldStrings, worldNavLabel } from '@/lib/i18n/worldStrings';
import { buildAnalysisArticleJsonLd } from '@/lib/seo/analysis-jsonld';
import { analysisPageSlug, analysisPath, pickAnalysisPageVersion } from '@/lib/seo/book-analysis';
import { pickSummaryVersion, summaryPath } from '@/lib/seo/book-summary';
import { worldPageSlug } from '@/lib/seo/book-world';
import { versionHasWorld } from '@/lib/seo/world-path';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { formatLongDateUtc } from '@/lib/utils/date';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { resolveAuthorHref } from '../authorHref';
import { BookSectionNav, buildBookSectionNavItems } from '../BookSectionNav';
import { BookContinueBlock, BookCtaButtons } from '../BookSubpageActions';
import { BookSubpageHero } from '../BookSubpageHero';
import { RelatedBooksSection } from '../RelatedBooksSection';
import styles from './analysis.module.scss';
import { ANALYSIS_ANCHORS } from './analysisAnchors';
import { FactsCard, Paragraphs, Section, type ChapterLinker } from './AnalysisBlocks';
import { loadAnalysisOrNotFound } from './analysisData';
import { buildAnalysisFactRows } from './analysisFacts';
import { buildAnalysisMetadata } from './analysisMetadata';
import { AnalysisSections } from './AnalysisSections';
import { readerChapterHref } from '../read/chapterParam';
import { loadLinkEntities, makeLinkSession } from '../worldLinks';

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

  // Список мира (F08-5) параллельно с анализом, версия - правилом загрузчика; не отклоняется.
  const worldEntitiesLoad = loadLinkEntities(pickAnalysisPageVersion(book, supportedLang));
  const { version, analysis } = await loadAnalysisOrNotFound(book, supportedLang, slug);

  const dict = getDictionary(supportedLang);
  const t = dict.book;
  const analysisT = getAnalysisStrings(supportedLang);
  const bookSlug = book.slug || slug;
  const bookHref = `/${supportedLang}/book/${bookSlug}`;
  // `LEGACY-489`: адрес страницы и ссылка «книга» - по `analysisPageSlug`; `bookSlug` выше идёт
  // в остальные ссылки как раньше.
  const ownSlug = analysisPageSlug(version, book, slug);
  const bookCardHref = `/${supportedLang}/book/${ownSlug}`;
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

  const worldEntities = await worldEntitiesLoad;
  const links = makeLinkSession({
    entities: worldEntities,
    lang: supportedLang,
    book,
    version,
    routeSlug: slug,
    chapter: { template: analysisT.analysisChapter, href: linker.href },
  });
  const worldStrings = getWorldStrings(supportedLang);

  const navItems = buildBookSectionNavItems({
    lang: supportedLang,
    bookSlug,
    hasText: Boolean(read),
    hasAudio: Boolean(listen),
    hasSummary: Boolean(summary),
    // Пункт этой страницы - активный, он есть всегда; на других страницах книги пункт - по счётчику.
    hasAnalysis: true,
    hasWorld: versionHasWorld(version),
    labels: {
      book: t.bookNavBook,
      read: t.read,
      listen: t.listen,
      summary: t.summary,
      analysis: t.analysis,
      world: worldNavLabel(supportedLang),
    },
  });

  const factRows = buildAnalysisFactRows(
    analysis,
    {
      version,
      firstPublishedYear: book.firstPublishedYear,
      shownTitle: title,
      lang: supportedLang,
    },
    t,
    analysisT
  );

  // Подпись (§20) - всегда: страница есть только при ядре; дата - при разборчивой дате изменения.
  const updatedAt = new Date(analysis.updatedAt);
  const updatedDate = Number.isNaN(updatedAt.getTime())
    ? null
    : formatLongDateUtc(updatedAt, supportedLang);

  const jsonLd = buildAnalysisArticleJsonLd({
    lang: supportedLang,
    pageSlug: ownSlug,
    // `LEGACY-472`: то же правило, что `bookCardSlug` бэкенда - без своего слага версия идёт по слагу книги.
    bookSchemaSlug: ownSlug,
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
            { label: title, href: bookCardHref },
            { label: t.analysis },
          ]}
        />

        {/* Жанр - в карточке произведения из анализа; в шапке его нет: два разных жанра на одной странице (§4). */}
        <BookSubpageHero
          bookHref={bookCardHref}
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
            links={links}
            actions={
              <BookCtaButtons read={read} listen={listen} className={styles.factActions}>
                {summary ? (
                  <Link href={summary.href} className={styles.textLink}>
                    {summary.label}
                  </Link>
                ) : null}
              </BookCtaButtons>
            }
          />

          <Section id={ANALYSIS_ANCHORS.mainIdea} title={analysisT.analysisMainIdeaTitle}>
            <div className={styles.mainIdea}>
              <Paragraphs text={analysis.mainIdea} links={links} />
            </div>
          </Section>

          <AnalysisSections
            analysis={analysis}
            linker={linker}
            links={links}
            strings={analysisT}
            tocTitle={dict.common.tableOfContents}
            faqTitle={t.faqTitle}
            characterMore={worldStrings.worldCardMore}
            objectMore={worldStrings.worldObjectMore}
            heroes={{
              title: worldStrings.worldBookHeroesTitle,
              heroes: pickBookHeroes(worldEntities),
              lang: supportedLang,
              worldSlug: worldPageSlug(version, book, slug),
            }}
          />

          {/* Подпись ведёт на раздел редполитики об анализе (решение арбитра `F03 | F03-3`, В5). */}
          <EditorialByline
            lang={supportedLang}
            teamLabel={t.editorialTeam}
            anchor="analysis"
            dateText={updatedDate ? t.updatedOn.replace('{date}', updatedDate) : undefined}
          />

          {/* «Дальше» (§3 п.21) - тот же блок, что у пересказа. */}
          <BookContinueBlock
            id={ANALYSIS_ANCHORS.continue}
            title={t.summaryContinueTitle}
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
