import Link from 'next/link';
import { hasText } from '@/lib/book-analysis/format';
import { fillTemplate } from '@/lib/book-world/format';
import { analysisRoleLabels, type AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { WorldSpoilerInput } from './worldSpoiler';
import type { PageSection } from '../analysis/PageSections';
import type { RelationMap as RelationMapData } from '@/lib/book-analysis/relation-map';
import type { LinkSession } from '@/lib/book-world/link-entities';
import type { WorldStrings } from '@/lib/i18n/worldStrings';
import type { BookWorldEntitySummary, BookWorldMap, BookWorldPlaceCard } from '@/types/api-schema';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import { literaryMap, placeScenes } from './WorldIndexMap';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef, Paragraphs, type ChapterLinker } from '../analysis/AnalysisBlocks';
import { RelationMap } from '../analysis/RelationMap';
import { LinkedMark } from '../LinkedText';
import { placeKindLabel } from './WorldPlaceSections';

export interface WorldIndexSectionsInput {
  /** Публичные сущности версии (список читателя отдаёт только их). */
  characters: readonly BookWorldEntitySummary[];
  /** Места общей страницы (F08-12a, Q4): со страницей и без. */
  places: readonly BookWorldPlaceCard[];
  /**
   * Литературная карта (`F08-12d`): `null` или нет поля - блока карты нет, список мест остаётся
   * (точек нет, тайл не взялся, бэкенд до F08-12d).
   */
  map: BookWorldMap | null;
  /** Название книги - в доступное имя карты. */
  bookTitle: string;
  /**
   * Спойлер-остров сцен мест (решение `F08 | F08-12c` Q4): текстовая версия прогресса и главы.
   * Глав версии список мира не отдаёт - вызывающий передаёт главы сцен мест: сцену удалённой главы
   * пересчёт присутствия уводит в `mentions.stale`, и в карточку она не попадает (решение
   * `F08 | F08-12c` R1).
   */
  spoiler: Pick<WorldSpoilerInput, 'progressVersionId' | 'chapterNumbers'>;
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
 * страницу героя, карта отношений своим разделом узлами-ссылками, места списком (F08-12c), ссылки
 * на анализ, пересказ и чтение с начала.
 * Раздел без данных не выводится (§1 п.5).
 */
export function buildIndexSections(input: WorldIndexSectionsInput): PageSection[] {
  const { characters, places, strings, analysisStrings, linker, relationMap, textLinks, links } =
    input;
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

  // Места (§4 п.6, решение `F08 | F08-12c` Q4) - после карты отношений.
  if (places.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.places,
      title: strings.worldPlacesTitle,
      body: (
        <>
          {literaryMap(input)}
          <ul className={analysisStyles.cards}>
            {places.map((p) => (
              <li key={p.key} className={analysisStyles.card}>
                {placeCardBody(p, input)}
              </li>
            ))}
          </ul>
        </>
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

/**
 * Карточка места на `/wiki` (решение `F08 | F08-12c` Q4): имя ссылкой только при своей странице,
 * вид, «Коротко», где находится, сцены с «глава N» под спойлер-островом своей главы; точка - на карте выше.
 * У места без страницы и без «Коротко» отметки перелинковки нет: ссылки на него нет вовсе.
 */
function placeCardBody(p: BookWorldPlaceCard, input: WorldIndexSectionsInput) {
  const { strings, textLinks } = input;
  const kind = placeKindLabel(p.kind, strings);
  const mark = p.hasPage ? <LinkedMark links={textLinks} entityKey={p.key} /> : null;
  return (
    <>
      <h3 className={analysisStyles.cardTitle}>
        {p.hasPage ? (
          <Link href={input.entityHref(p.key)} className={analysisStyles.textLink}>
            {p.name}
          </Link>
        ) : (
          p.name
        )}
        {kind ? <span className={analysisStyles.role}>{kind}</span> : null}
      </h3>
      {hasText(p.short) ? (
        <div className={analysisStyles.text}>
          <Paragraphs text={p.short} links={textLinks} linkedKey={p.hasPage ? p.key : undefined} />
        </div>
      ) : (
        mark
      )}
      {hasText(p.location) ? (
        <p className={analysisStyles.cardMeta}>
          {fillTemplate(strings.worldPlaceLocationLine, {
            label: strings.worldPlaceInfoLocation,
            value: p.location,
          })}
        </p>
      ) : null}
      {placeScenes(p, input)}
    </>
  );
}
