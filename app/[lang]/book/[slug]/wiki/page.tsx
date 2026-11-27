import { redirect } from 'next/navigation';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { WorldBeacon } from '@/components/public/WorldBeacon';
import { buildRelationMap } from '@/lib/book-analysis/relation-map';
import { fillTemplate, updatedAtRange } from '@/lib/book-world/format';
import { worldNavLabel } from '@/lib/i18n/worldStrings';
import { buildWorldArticleJsonLd } from '@/lib/seo/world-jsonld';
import { worldPath } from '@/lib/seo/world-path';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { BookSectionNav } from '../BookSectionNav';
import { BookSubpageHero } from '../BookSubpageHero';
import styles from './wiki.module.scss';
import { loadWorldOrNotFound } from './wikiData';
import { buildWorldIndexMetadata } from './wikiMetadata';
import { buildWorldPageContext, formatWorldDate } from './wikiPageContext';
import { buildIndexSections } from './WorldIndexSections';
import { PageSections } from '../analysis/PageSections';
import { readerChapterHref } from '../read/chapterParam';
import { makeLinkSession, worldEntityHref } from '../worldLinks';

type Props = {
  params: Promise<{ lang: string; slug: string }>;
};

export const revalidate = 300;

const worldUrl = (lang: string) => (bookSlug: string) => `/${lang}${worldPath(bookSlug)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  return buildWorldIndexMetadata(lang as SupportedLang, slug);
}

/**
 * Общая страница «Мир книги» (F08-3b, `product.md` §4): серверный рендер, индексируется (пока книга
 * не закрыта редактором от индекса). Существует, если у версии языка страницы есть хотя бы одна
 * публичная сущность, иначе 404.
 */
export default async function BookWorldPage({ params }: Props) {
  const { lang, slug } = await params;
  const supportedLang = lang as SupportedLang;

  const book = await resolveBookForSubroute(supportedLang, slug, worldUrl(lang));

  // 307, а не 308, как у анализа и пересказа (решение арбитра 06.09.2026).
  if (book.slug && book.slug !== slug) {
    redirect(worldUrl(lang)(book.slug));
  }

  const { version, world, characters, analysis } = await loadWorldOrNotFound(
    book,
    supportedLang,
    slug
  );
  const ctx = buildWorldPageContext({ book, version, lang: supportedLang, slug });
  const { strings, t } = ctx;

  const pageTitle = fillTemplate(strings.worldIndexTitle, { title: ctx.title });

  // Карта отношений - из анализа книги (§4 п.5); анализа нет или не прочитался - блока нет.
  const relationMap = analysis?.characters ? buildRelationMap(analysis.characters) : null;

  // Главы версии списком мира не отдаются: «впервые - глава N» считает бэкенд по тексту версии,
  // поэтому глава есть, когда у книги есть текст. Глава сцены места держится тем же пересчётом:
  // сцена удалённой главы уходит в `mentions.stale`, и бэкенд не отдаёт её в карточке
  // (`freshScenes`, решение `F08 | F08-12c` R1).
  const linker = {
    label: (n: number) => fillTemplate(ctx.analysisStrings.analysisChapter, { n }),
    href: (n: number) => (ctx.read ? readerChapterHref(ctx.bookHref, n) : null),
  };

  // Перелинковка (F08-5): имена героев в текстах карточек; «глава N» на общей странице не ссылается (Q6).
  const textLinks = makeLinkSession({
    entities: world.entities,
    lang: supportedLang,
    book,
    version,
    routeSlug: slug,
  });

  const places = world.places;
  const sections = buildIndexSections({
    characters,
    places,
    // Карта (F08-12d) - только у ответа с `?map=1`; старый бэкенд поля не отдаёт.
    map: world.map ?? null,
    bookTitle: ctx.title,
    spoiler: {
      progressVersionId: book.versionIds?.text ?? null,
      chapterNumbers: [...new Set(places.flatMap((p) => p.scenes.map((s) => s.chapter)))],
    },
    strings,
    analysisStrings: ctx.analysisStrings,
    linker,
    entityHref: (key) => worldEntityHref(supportedLang, ctx.ownSlug, key),
    relationMap,
    textLinks,
    links: {
      analysis: ctx.analysisHref,
      summary: ctx.summary,
      // «Читать с начала» (§4 п.7) - на первую главу, а не на сохранённое место читалки.
      read: ctx.read
        ? { href: readerChapterHref(ctx.bookHref, 1), label: strings.worldReadFromStart }
        : null,
    },
  });

  const { earliest, latest: updatedAt } = updatedAtRange(world.entities.map((e) => e.updatedAt));
  // Сущности есть (иначе 404 выше), а ни одна дата не разобралась - ответ не той формы: эпоха 1970
  // в разметке была бы уверенной ложью при ответе 200.
  if (earliest === null || updatedAt === null) {
    throw new Error(`World of version "${version.id}" carries no readable updatedAt`);
  }

  const jsonLd = buildWorldArticleJsonLd({
    lang: supportedLang,
    pageSlug: ctx.ownSlug,
    bookSchemaSlug: ctx.ownSlug,
    headline: pageTitle,
    editorialTeam: t.editorialTeam,
    createdAt: earliest,
    updatedAt,
    coverUrl: book.coverUrl,
  });

  return (
    <div className={styles.wikiPage}>
      <div className={styles.container}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
        <WorldBeacon bookVersionId={version.id}>
          <Breadcrumbs
            items={[
              { label: ctx.dict.breadcrumb.home, href: `/${supportedLang}` },
              { label: ctx.title, href: ctx.bookCardHref },
              { label: worldNavLabel(supportedLang) },
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

          <BookSectionNav items={ctx.navItems} active="world" ariaLabel={t.bookNavLabel} />

          <div className={styles.content}>
            <PageSections
              sections={sections}
              tocTitle={ctx.dict.common.tableOfContents}
              tocId="world-toc-title"
            />

            {/* Подпись (§12): дата - наибольший `updatedAt` публичных сущностей (решение арбитра Q12). */}
            <EditorialByline
              lang={supportedLang}
              teamLabel={t.editorialTeam}
              anchor="world"
              dateText={formatWorldDate(updatedAt, supportedLang, t.updatedOn)}
            />
          </div>
        </WorldBeacon>
      </div>
    </div>
  );
}
