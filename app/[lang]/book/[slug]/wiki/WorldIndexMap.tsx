import Link from 'next/link';
import { fillTemplate } from '@/lib/book-world/format';
import type { WorldIndexSectionsInput } from './WorldIndexSections';
import type { BookWorldPlaceCard } from '@/types/api-schema';
import styles from './wiki.module.scss';
import { isDrawableMap, WikidataSource, WorldMap } from './WorldMap';
import { withSpoilerGate } from './worldSpoiler';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef } from '../analysis/AnalysisBlocks';

/**
 * Литературная карта внутри раздела «Места», перед списком (решения `F08 | F08-12d` П1, П2): точки
 * с номерами и легенда - номер, имя ссылкой только при своей странице, источник координат ссылкой
 * на Wikidata и сцены «глава N» под тем же спойлер-островом, что в карточке. Точка, места которой
 * нет в списке (так бэкенд ответ не строит), не рисуется ни на карте, ни в легенде: номер на карте
 * всегда совпадает с пунктом легенды. Точек не осталось - блока нет (§1 п.5).
 */
export function literaryMap(input: WorldIndexSectionsInput) {
  const { map, places, strings } = input;
  if (!isDrawableMap(map)) return null;
  const byKey = new Map(places.map((p) => [p.key, p]));
  const legend = map.points.flatMap((point) => {
    const place = byKey.get(point.key);
    return place ? [{ point, place }] : [];
  });
  if (legend.length === 0) return null;
  return (
    <>
      <h3 className={analysisStyles.cardTitle}>{strings.worldMapTitle}</h3>
      <WorldMap
        map={{ ...map, points: legend.map((l) => l.point) }}
        numbered
        label={fillTemplate(strings.worldMapLabel, { title: input.bookTitle })}
      />
      <ol className={styles.mapLegend}>
        {legend.map(({ place: p }) => (
          <li key={p.key}>
            {p.hasPage ? (
              <Link href={input.entityHref(p.key)} className={analysisStyles.textLink}>
                {p.name}
              </Link>
            ) : (
              p.name
            )}
            {p.point ? (
              <>
                {' ('}
                <WikidataSource href={p.point.sourceUrl} label={strings.worldMapCoordinates} />
                {')'}
              </>
            ) : null}
            {placeScenes(p, input)}
          </li>
        ))}
      </ol>
    </>
  );
}

/** Сцены места с «глава N» под спойлер-островом своей главы (решение `F08 | F08-12c` Q4). */
export function placeScenes(p: BookWorldPlaceCard, input: WorldIndexSectionsInput) {
  if (p.scenes.length === 0) return null;
  const gate = { ...input.spoiler, strings: input.strings };
  return (
    <ul className={styles.plainList}>
      {p.scenes.map((scene, i) => (
        <li key={`${scene.chapter}-${i}`}>
          {withSpoilerGate(
            gate,
            scene.chapter,
            <>
              {scene.title}
              {input.strings.worldPlaceSceneSeparator}
              <ChapterRef n={scene.chapter} linker={input.linker} />
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
