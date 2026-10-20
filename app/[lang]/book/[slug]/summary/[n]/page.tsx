import { AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { RichTextContent } from '@/components/common/RichTextContent';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { getAnalysisStrings } from '@/lib/i18n/analysisStrings';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getSummaryStrings } from '@/lib/i18n/summaryStrings';
import { buildSummarySectionJsonLd } from '@/lib/seo/summary-jsonld';
import { SUMMARY_BRIEF_ANCHOR, summaryPath, summarySectionPath } from '@/lib/seo/summary-path';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { formatLongDateUtc } from '@/lib/utils/date';
import { demoteH1 } from '@/lib/utils/heading-anchors';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import { parseOrdinal } from '@/lib/utils/ordinal-param';
import { readingMinutes } from '@/lib/utils/reading-time';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { BookSectionNav } from '../../BookSectionNav';
import { BookContinueBlock } from '../../BookSubpageActions';
import { BookSubpageHero } from '../../BookSubpageHero';
import { readerChapterHref } from '../../read/chapterParam';
import styles from '../summary.module.scss';
import { buildSummaryBookContext } from '../summaryBookContext';
import { SummarySectionsToc } from '../SummarySectionsToc';
import { loadSectionOrNotFound } from './sectionData';
import { buildSectionMetadata, summarySectionHeading } from './sectionMetadata';
import { SectionPager } from './SectionPager';

type Props = {
  params: Promise<{ lang: string; slug: string; n: string }>;
};

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug, n } = await params;
  return buildSectionMetadata(lang as SupportedLang, slug, n);
}

/**
 * Страница раздела пересказа `/{lang}/book/{slug}/summary/{n}` (F04-3, D1, D3): серверный рендер,
 * индексируется. Номер - общим правилом T3, кривой номер - 404 до запроса. Блок претензии по
 * стране закрывает middleware (`lib/claim-closures.ts`), на весь мир - ответ ручки (451 → 404).
 */
export default async function SummarySectionPage({ params }: Props) {
  const { lang, slug, n: rawN } = await params;
  const n = parseOrdinal(rawN);
  if (n === null) notFound();
  const supportedLang = lang as SupportedLang;
  const sectionUrl = (bookSlug: string) => `/${lang}${summarySectionPath(bookSlug, n)}`;

  const book = await resolveBookForSubroute(supportedLang, slug, sectionUrl);
  // 307, а не 308, как у пересказа (решение арбитра 06.09.2026).
  if (book.slug && book.slug !== slug) redirect(sectionUrl(book.slug));

  const { version, section, plainText, sections } = await loadSectionOrNotFound(
    book,
    supportedLang,
    slug,
    n
  );

  const dict = getDictionary(supportedLang);
  const strings = getSummaryStrings(supportedLang);
  const ctx = buildSummaryBookContext({ book, version, lang: supportedLang, slug, dict });
  const summaryHref = `/${supportedLang}${summaryPath(ctx.bookSlug)}`;
  const heading = summarySectionHeading(supportedLang, ctx.title, section.title);
  const readingTime = dict.book.summaryReadingTime.replace(
    '{minutes}',
    String(readingMinutes(plainText))
  );
  // «Читать эту главу» - глава указана, у версии есть текст и такая глава в нём есть (§5 п.6).
  const chapterHref =
    ctx.readHref && section.readerChapter !== null && section.readerChapterExists === true
      ? readerChapterHref(ctx.bookHref, section.readerChapter)
      : null;

  const contentDate = new Date(section.contentDate);
  const dateText = Number.isNaN(contentDate.getTime())
    ? null
    : formatLongDateUtc(contentDate, supportedLang);
  const jsonLd = dateText
    ? buildSummarySectionJsonLd({
        lang: supportedLang,
        bookSlug: ctx.bookSlug,
        number: n,
        bookTitle: ctx.title,
        headline: heading,
        editorialTeam: dict.book.editorialTeam,
        contentDate: section.contentDate,
      })
    : null;

  // Ссылки §5 п.9: «Очень кратко» - только при блоке, «Полный пересказ», «Анализ» - если есть.
  const links = [
    ...(section.briefHasText === true
      ? [{ href: `${summaryHref}#${SUMMARY_BRIEF_ANCHOR}`, label: strings.summaryBriefTitle }]
      : []),
    { href: summaryHref, label: strings.summaryFullTitle },
    // Подпись - та же, что у ссылки на анализ в «Узнать больше» на `/summary`.
    ...(ctx.analysisHref
      ? [{ href: ctx.analysisHref, label: getAnalysisStrings(supportedLang).analysisExploreLink }]
      : []),
  ];

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
            { label: ctx.title, href: ctx.bookHref },
            { label: dict.book.summary, href: summaryHref },
            { label: section.title },
          ]}
        />

        <BookSubpageHero
          bookHref={ctx.bookHref}
          coverUrl={book.coverUrl}
          kicker={dict.book.summaryPageSubtitle}
          title={heading}
          byLabel={dict.book.by}
          authorName={ctx.authorName}
          authorHref={ctx.authorHref}
          meta={[
            ...(ctx.year ? [{ key: 'year', content: ctx.year }] : []),
            ...(ctx.genre ? [{ key: 'genre', content: ctx.genre }] : []),
          ]}
        />

        <BookSectionNav
          items={ctx.navItems}
          active="summary"
          activeIsLink
          ariaLabel={dict.book.bookNavLabel}
        />

        <div className={styles.layout}>
          <article className={styles.main}>
            <p className={styles.spoiler} role="note">
              <AlertTriangle size={16} aria-hidden="true" />
              {strings.summarySectionSpoiler}
            </p>
            <EditorialByline
              lang={supportedLang}
              teamLabel={dict.book.editorialTeam}
              dateText={dateText ? dict.book.updatedOn.replace('{date}', dateText) : undefined}
            />
            <p className={styles.sectionReading}>
              <Clock size={14} aria-hidden="true" />
              {readingTime}
            </p>
            <RichTextContent
              html={section.text}
              transformSafeHtml={demoteH1}
              className={styles.text}
            />
            {chapterHref && (
              <p className={styles.readChapter}>
                <Link href={chapterHref}>{strings.summaryReadChapter}</Link>
              </p>
            )}
            <SectionPager
              lang={supportedLang}
              bookSlug={ctx.bookSlug}
              current={n}
              sections={sections}
              ariaLabel={dict.a11y.pagination}
            />
            <ul className={styles.linkList}>
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </article>

          {/* Сайдбар на десктопе, после текста на телефоне - та же сетка, что у `/summary` (§5 п.8). */}
          <aside className={styles.sidebar}>
            <SummarySectionsToc
              lang={supportedLang}
              bookSlug={ctx.bookSlug}
              title={strings.summarySectionsTitle}
              sections={sections}
              current={n}
              className={styles.sideCard}
              titleClassName={styles.sideTitle}
            />
          </aside>
        </div>

        <BookContinueBlock
          id="summary-continue"
          title={dict.book.summaryContinueTitle}
          read={ctx.readHref ? { href: ctx.readHref, label: dict.book.readFullBook } : null}
          listen={
            ctx.listenHref ? { href: ctx.listenHref, label: dict.book.listenAudiobook } : null
          }
        />
      </div>
    </div>
  );
}
