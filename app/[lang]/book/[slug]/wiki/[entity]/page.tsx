import { notFound, redirect } from 'next/navigation';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { WorldBeacon } from '@/components/public/WorldBeacon';
import { fillTemplate } from '@/lib/book-world/format';
import { worldNavLabel } from '@/lib/i18n/worldStrings';
import { isWorldEntityKey } from '@/lib/seo/book-world';
import { buildWorldArticleJsonLd } from '@/lib/seo/world-jsonld';
import { worldEntityPath, worldPath } from '@/lib/seo/world-path';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import type { WorldPerson } from '../worldEntityTypes';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { PageSections } from '../../analysis/PageSections';
import { BookSectionNav } from '../../BookSectionNav';
import { BookSubpageHero } from '../../BookSubpageHero';
import { listenChapterHref, readerChapterHref } from '../../read/chapterParam';
import styles from '../wiki.module.scss';
import { loadWorldEntityOrNotFound } from '../wikiData';
import { buildWorldEntityMetadata } from '../wikiMetadata';
import { buildChapterLinker, buildWorldPageContext, formatWorldDate } from '../wikiPageContext';
import { buildEntitySections } from '../WorldEntitySections';

type Props = {
  params: Promise<{ lang: string; slug: string; entity: string }>;
};

export const revalidate = 300;

const entityUrl = (lang: string, key: string) => (bookSlug: string) =>
  `/${lang}${worldEntityPath(bookSlug, key)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug, entity } = await params;
  return buildWorldEntityMetadata(lang as SupportedLang, slug, entity);
}

/**
 * Страница героя (F08-3b, `product.md` §5): серверный рендер. Есть, только если ручка отдала
 * сущность (ядро, «прочитано», показ включён), иначе 404. `isIndexable=false` - открыта, но
 * `noindex, follow` (мета).
 */
export default async function BookWorldEntityPage({ params }: Props) {
  const { lang, slug, entity: key } = await params;
  const supportedLang = lang as SupportedLang;

  // Ключ из адреса проверяется до любого запроса (`tech.md` §6).
  if (!isWorldEntityKey(key)) notFound();

  const book = await resolveBookForSubroute(supportedLang, slug, entityUrl(lang, key));

  if (book.slug && book.slug !== slug) {
    redirect(entityUrl(lang, key)(book.slug));
  }

  const { version, detail, entities, analysis, audioChapters } = await loadWorldEntityOrNotFound(
    book,
    supportedLang,
    slug,
    key
  );
  const { entity, chapterNumbers } = detail;
  const ctx = buildWorldPageContext({ book, version, lang: supportedLang, slug });
  const { strings, t } = ctx;

  // Ссылка «глава N» - только на главу из `chapterNumbers`; у версии без текста ссылок нет (§1 п.7).
  const chapterSet = new Set(ctx.read ? chapterNumbers : []);
  const linker = buildChapterLinker(ctx.bookHref, ctx.analysisStrings.analysisChapter, chapterSet);

  // Герои для ссылок: запасные имена из анализа, поверх них - публичные сущности со страницей.
  const people = new Map<string, WorldPerson>();
  for (const c of analysis?.characters ?? []) people.set(c.key, { name: c.name, href: null });
  for (const e of entities) {
    people.set(e.key, {
      name: e.name,
      href: `/${supportedLang}${worldEntityPath(ctx.bookSlug, e.key)}`,
      short: e.short,
    });
  }

  const sections = buildEntitySections({
    entity,
    chapterNumbers,
    strings,
    analysisStrings: ctx.analysisStrings,
    linker,
    people,
    audioChapters,
    listenHref: ctx.listen ? (n) => listenChapterHref(ctx.bookHref, n) : null,
    readerHref: (n) => (chapterSet.has(n) ? readerChapterHref(ctx.bookHref, n) : null),
    links: {
      analysis: ctx.analysisHref,
      analysisHasThemes: (analysis?.themes?.length ?? 0) > 0,
      summary: ctx.summary,
    },
  });

  const pageTitle = fillTemplate(strings.worldEntityTitle, { name: entity.name, title: ctx.title });

  const jsonLd = buildWorldArticleJsonLd({
    lang: supportedLang,
    pageSlug: ctx.ownSlug,
    bookSchemaSlug: ctx.ownSlug,
    entityKey: key,
    headline: pageTitle,
    editorialTeam: t.editorialTeam,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    coverUrl: book.coverUrl,
  });

  const worldHref = `/${supportedLang}${worldPath(ctx.bookSlug)}`;

  return (
    <div className={styles.wikiPage}>
      <div className={styles.container}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <WorldBeacon bookVersionId={version.id} entityKey={key}>
          <Breadcrumbs
            items={[
              { label: ctx.dict.breadcrumb.home, href: `/${supportedLang}` },
              { label: ctx.title, href: ctx.bookCardHref },
              { label: worldNavLabel(supportedLang), href: worldHref },
              { label: entity.name },
            ]}
          />

          <BookSubpageHero
            bookHref={ctx.bookCardHref}
            coverUrl={book.coverUrl}
            kicker={worldNavLabel(supportedLang)}
            title={pageTitle}
            byLabel={t.by}
            authorName={ctx.authorName}
            authorHref={ctx.authorHref}
            meta={ctx.year ? [{ key: 'year', content: ctx.year }] : []}
          />

          {/* «Мир книги» - активный пункт, ссылкой на общую страницу (§5 п.3). */}
          <BookSectionNav
            items={ctx.navItems}
            active="world"
            activeIsLink
            ariaLabel={t.bookNavLabel}
          />

          <div className={styles.content}>
            <PageSections
              sections={sections}
              tocTitle={ctx.dict.common.tableOfContents}
              tocId="world-toc-title"
            />

            <EditorialByline
              lang={supportedLang}
              teamLabel={t.editorialTeam}
              anchor="world"
              dateText={formatWorldDate(entity.updatedAt, supportedLang, t.updatedOn)}
            />
          </div>
        </WorldBeacon>
      </div>
    </div>
  );
}
