import { notFound, redirect } from 'next/navigation';
import { EditorialByline } from '@/components/public/books/EditorialByline';
import { Breadcrumbs } from '@/components/public/Breadcrumbs/Breadcrumbs';
import { WorldBeacon } from '@/components/public/WorldBeacon';
import { fillTemplate } from '@/lib/book-world/format';
import { worldImageTypeAllowed } from '@/lib/book-world/image';
import { canonicalPairMembers, pairDisplayName } from '@/lib/book-world/pair';
import { worldNavLabel } from '@/lib/i18n/worldStrings';
import { isWorldEntityKey } from '@/lib/seo/book-world';
import { buildWorldArticleJsonLd } from '@/lib/seo/world-jsonld';
import { worldPath } from '@/lib/seo/world-path';
import { resolveBookForSubroute } from '@/lib/utils/book-route-guard';
import { serializeJsonLd } from '@/lib/utils/json-ld';
import { logError } from '@/lib/utils/log-error';
import type {
  WorldEntitySectionsInput,
  WorldIllustration,
  WorldPairMember,
} from '../worldEntityTypes';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { Metadata } from 'next';
import { PageSections } from '../../analysis/PageSections';
import { BookSectionNav } from '../../BookSectionNav';
import { BookSubpageHero } from '../../BookSubpageHero';
import { listenChapterHref, readerSceneHref } from '../../read/chapterParam';
import { makeLinkSession, worldEntityHref } from '../../worldLinks';
import styles from '../wiki.module.scss';
import { loadWorldEntityOrNotFound } from '../wikiData';
import { buildWorldEntityMetadata } from '../wikiMetadata';
import { buildChapterLinker, buildWorldPageContext, formatWorldDate } from '../wikiPageContext';
import { buildSectionsOfType } from '../WorldEntitySections';
import { entityPageTitle } from '../worldEntityTitles';
import { buildPairSections } from '../WorldPairSections';
import { buildWorldPeople, worldPairLinks } from '../worldPeople';
import { heroThemeKeysOf } from '../worldThemes';

type Props = {
  params: Promise<{ lang: string; slug: string; entity: string }>;
};

export const revalidate = 300;

// Адрес маршрута для перехода со старого слага книги: тот же помощник, слаг - книги (редирект).
const entityUrl = (lang: string, key: string) => (bookSlug: string) =>
  worldEntityHref(lang, bookSlug, key);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug, entity } = await params;
  return buildWorldEntityMetadata(lang as SupportedLang, slug, entity);
}

/**
 * Страница героя (F08-3b, `product.md` §5), пары героев (F08-8c, §6; ключ `{a}--{b}`, тип `pair`),
 * места (F08-12c, §7; тип `place`) или предмета, понятия, события (F08-13c, §7; `object`, `term`,
 * `event`): серверный рендер. Есть, только если ручка отдала
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
  // Пара с ключом не в каноническом виде (`a---b`, `b--a`, `a--a`) - не страница героя и не пары: 404.
  const pairKeys = entity.type === 'pair' ? canonicalPairMembers(key) : null;
  if (entity.type === 'pair' && !pairKeys) {
    logError('Book world pair with a non-canonical key:', key);
    notFound();
  }
  const ctx = buildWorldPageContext({ book, version, lang: supportedLang, slug });
  const { strings, t } = ctx;

  // Ссылка «глава N» - только на главу из `chapterNumbers`; у версии без текста ссылок нет (§1 п.7).
  const chapterSet = new Set(ctx.read ? chapterNumbers : []);
  const linker = buildChapterLinker(ctx.bookHref, ctx.analysisStrings.analysisChapter, chapterSet);

  // Перелинковка (F08-5): имена других героев и «глава N» в текстах; на себя ссылки нет.
  const textLinks = makeLinkSession({
    entities,
    lang: supportedLang,
    book,
    version,
    routeSlug: slug,
    selfKey: key,
    chapter: { template: ctx.analysisStrings.analysisChapter, href: linker.href },
  });

  // Герои для ссылок: запасные имена из анализа, поверх них - публичные сущности со страницей.
  const hrefOf = (k: string) => worldEntityHref(supportedLang, ctx.ownSlug, k);
  const people = buildWorldPeople(entities, analysis?.characters, hrefOf);

  // Публичные пары героя из списка мира (бэкенд отдаёт только публичные) - строками в «Отношениях».
  const pairLinks =
    entity.type === 'character'
      ? worldPairLinks({
          entities,
          heroKey: key,
          people,
          namesTemplate: strings.worldPairNames,
          hrefOf,
        })
      : [];

  // Иллюстрация (F08-11c): у героя и места (F08-12c-2, `worldImageTypeAllowed`); `alt` и подпись -
  // по языку страницы, файл общий.
  const image = worldImageTypeAllowed(entity.type) ? (detail.image ?? null) : null;
  const illustration: WorldIllustration | null = image
    ? {
        image,
        alt: fillTemplate(strings.worldImageAlt, { name: entity.name, title: ctx.title }),
        caption: strings.worldImageCaption,
        entityType: entity.type,
        policyHref: `/${supportedLang}/editorial-policy#world`,
      }
    : null;

  const sectionsInput: WorldEntitySectionsInput = {
    entity,
    illustration,
    // Малая карта (F08-12d) - только у реального места с точкой; старый бэкенд поля не отдаёт.
    map: entity.type === 'place' ? (detail.map ?? null) : null,
    progressVersionId: book.versionIds?.text ?? null,
    chapterNumbers,
    strings,
    analysisStrings: ctx.analysisStrings,
    linker,
    textLinks,
    people,
    themeTitles: new Map((analysis?.themes ?? []).map((th) => [th.key, th.title])),
    heroThemeKeys: heroThemeKeysOf(entity, analysis),
    audioChapters,
    listenHref: ctx.listen ? (n) => listenChapterHref(ctx.bookHref, n) : null,
    readerHref: (n, p = null) => (chapterSet.has(n) ? readerSceneHref(ctx.bookHref, n, p) : null),
    links: {
      analysis: ctx.analysisHref,
      analysisHasThemes: (analysis?.themes?.length ?? 0) > 0,
      summary: ctx.summary,
    },
    pairLinks,
  };

  // Страница пары: имена героев - из списка мира и анализа; нет имени - имя сущности как есть.
  const members = pairKeys
    ? (pairKeys.map((k): WorldPairMember => ({ key: k, person: people.get(k) ?? null })) as [
        WorldPairMember,
        WorldPairMember,
      ])
    : null;
  const names = members
    ? pairDisplayName(strings.worldPairNames, key, (k) => people.get(k)?.name, entity.name)
    : entity.name;
  const sections = members
    ? buildPairSections({ ...sectionsInput, members, names })
    : buildSectionsOfType(sectionsInput);

  // Формулы h1 по типу (`product.md` §15) - `entityPageTitle`, рядом с формулой title.
  const pageTitle = members
    ? fillTemplate(strings.worldPairTitle, { names })
    : fillTemplate(entityPageTitle(entity.type, strings), {
        name: entity.name,
        title: ctx.title,
      });

  const jsonLd = buildWorldArticleJsonLd({
    lang: supportedLang,
    pageSlug: ctx.ownSlug,
    bookSchemaSlug: ctx.ownSlug,
    entityKey: key,
    headline: pageTitle,
    editorialTeam: t.editorialTeam,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    coverUrl: image?.url ?? book.coverUrl,
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
              { label: names },
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
