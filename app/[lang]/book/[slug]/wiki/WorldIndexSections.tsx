import Link from 'next/link';
import { hasText } from '@/lib/book-analysis/format';
import { analysisRoleLabels, type AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { PageSection } from '../analysis/PageSections';
import type { RelationMap as RelationMapData } from '@/lib/book-analysis/relation-map';
import type { LinkSession } from '@/lib/book-world/link-entities';
import type { WorldStrings } from '@/lib/i18n/worldStrings';
import type { BookWorldEntitySummary } from '@/types/api-schema';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef, Paragraphs, type ChapterLinker } from '../analysis/AnalysisBlocks';
import { RelationMap } from '../analysis/RelationMap';
import { LinkedMark } from '../LinkedText';

export interface WorldIndexSectionsInput {
  /** Публичные сущности версии (список читателя отдаёт только их). */
  characters: readonly BookWorldEntitySummary[];
  strings: WorldStrings;
  analysisStrings: AnalysisStrings;
  linker: ChapterLinker;
  /** Адрес страницы героя по ключу. */
  entityHref: (key: string) => string;
  /** Карта отношений из анализа книги; `null` - рисовать нечего. */
  relationMap: RelationMapData | null;
  /** Сессия ссылок страницы для текстов (F08-5, решение арбитра Q9); `null` - без перелинковки. */
  textLinks: LinkSession | null;
  links: {
    analysis: string | null;
    summary: { href: string; label: string } | null;
    read: { href: string; label: string } | null;
  };
}

/**
 * Разделы общей страницы мира (`product.md` §4): герои карточками с «впервые - глава N» и ссылкой на
 * страницу героя, карта отношений своим разделом узлами-ссылками, ссылки на анализ, пересказ и чтение
 * с начала.
 * Раздел без данных не выводится (§1 п.5).
 */
export function buildIndexSections(input: WorldIndexSectionsInput): PageSection[] {
  const { characters, strings, analysisStrings, linker, relationMap, textLinks, links } = input;
  const sections: PageSection[] = [];
  const roleLabels = analysisRoleLabels(analysisStrings);

  if (characters.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.heroes,
      title: strings.worldHeroesTitle,
      body: (
        <ul className={analysisStyles.cards}>
          {characters.map((c) => (
            <li key={c.key} className={analysisStyles.card}>
              <h3 className={analysisStyles.cardTitle}>
                <Link href={input.entityHref(c.key)} className={analysisStyles.textLink}>
                  {c.name}
                </Link>
                {c.role ? <span className={analysisStyles.role}>{roleLabels[c.role]}</span> : null}
              </h3>
              {hasText(c.short) ? (
                <div className={analysisStyles.text}>
                  <Paragraphs text={c.short} links={textLinks} linkedKey={c.key} />
                </div>
              ) : (
                // Заголовок уже ссылка: отметка нужна и без «Коротко».
                <LinkedMark links={textLinks} entityKey={c.key} />
              )}
              {typeof c.mentionFirst === 'number' ? (
                <p className={analysisStyles.cardMeta}>
                  {strings.worldInfoFirst}: <ChapterRef n={c.mentionFirst} linker={linker} />
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ),
    });
  }

  // Карта отношений (§4 п.5) - своим разделом после карточек героев; узлы - ссылки только на
  // публичных героев этого списка.
  if (relationMap) {
    const publicKeys = new Set(characters.map((c) => c.key));
    sections.push({
      id: WORLD_ANCHORS.relationsMap,
      title: analysisStrings.analysisRelationsTitle,
      body: (
        <RelationMap
          map={relationMap}
          title={analysisStrings.analysisRelationsTitle}
          withHeading={false}
          nodeHref={(key) => (publicKeys.has(key) ? input.entityHref(key) : null)}
        />
      ),
    });
  }

  if (links.analysis || links.summary || links.read) {
    sections.push({
      id: WORLD_ANCHORS.links,
      title: strings.worldLinksTitle,
      body: (
        <ul className={styles.plainList}>
          {links.analysis ? (
            <li>
              <Link href={links.analysis} className={analysisStyles.textLink}>
                {strings.worldAnalysisLink}
              </Link>
            </li>
          ) : null}
          {links.summary ? (
            <li>
              <Link href={links.summary.href} className={analysisStyles.textLink}>
                {links.summary.label}
              </Link>
            </li>
          ) : null}
          {links.read ? (
            <li>
              <Link href={links.read.href} prefetch={false} className={analysisStyles.textLink}>
                {links.read.label}
              </Link>
            </li>
          ) : null}
        </ul>
      ),
    });
  }

  return sections;
}
