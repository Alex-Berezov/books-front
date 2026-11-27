import { hasText } from '@/lib/book-analysis/format';
import { fillTemplate } from '@/lib/book-world/format';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import type { WorldStrings } from '@/lib/i18n/worldStrings';
import type { WorldPlaceKind } from '@/types/api-schema';
import { WORLD_ANCHORS } from './wikiAnchors';
import { buildEntityFaqSection, buildEntityQuotesSection } from './WorldEntityMore';
import {
  buildEntityPresenceSection,
  buildEntityScenesSection,
  buildEntityTextSections,
  WorldFacts,
  WorldIllustrationFigure,
  type WorldFact,
} from './WorldEntityParts';
import { isDrawableMap, WikidataSource, WorldMap } from './WorldMap';
import analysisStyles from '../analysis/analysis.module.scss';
import { Paragraphs } from '../analysis/AnalysisBlocks';

/** Подпись вида места (`product.md` §7: «реальное или вымышленное»); вида нет - `null`. */
export function placeKindLabel(kind: WorldPlaceKind | null | undefined, strings: WorldStrings) {
  if (kind === 'real') return strings.worldPlaceReal;
  if (kind === 'fictional') return strings.worldPlaceFictional;
  return null;
}

/**
 * Разделы страницы места (`product.md` §7, решение арбитра `F08 | F08-12c` Q3): «Коротко» с видом
 * и местоположением текстом, значение в книге, описание и цитаты, что здесь происходит (сцены с
 * главой), присутствие по главам, частые вопросы. Раздел без данных не собирается (§1 п.5). Принятая
 * картинка места (`F08-12c-2`) - в «Коротко», как у героя в инфобоксе. Малая карта реального места
 * с точкой (`F08-12d`, решение `F08 | F08-12d` П3) - отдельным блоком сразу после «Коротко».
 */
export function buildPlaceSections(input: WorldEntitySectionsInput): PageSection[] {
  const { entity, strings, textLinks, people, illustration, map } = input;
  const sections: PageSection[] = [];

  const facts: WorldFact[] = [];
  const kind = placeKindLabel(entity.kind, strings);
  if (kind) facts.push({ label: strings.worldPlaceInfoKind, value: kind });
  if (hasText(entity.location)) {
    facts.push({ label: strings.worldPlaceInfoLocation, value: entity.location });
  }
  if (hasText(entity.short) || facts.length > 0 || illustration) {
    sections.push({
      id: WORLD_ANCHORS.short,
      title: strings.worldShortTitle,
      body: (
        <>
          {illustration ? <WorldIllustrationFigure illustration={illustration} /> : null}
          {hasText(entity.short) ? (
            <div className={analysisStyles.mainIdea}>
              <Paragraphs text={entity.short} links={textLinks} />
            </div>
          ) : null}
          {facts.length > 0 ? <WorldFacts rows={facts} /> : null}
        </>
      ),
    });
  }

  // Нет карты или точки (вымышленное, без проверки, тайл не взялся) - блока нет (§1 п.5).
  if (isDrawableMap(map) && entity.point) {
    const source = entity.point.sourceUrl;
    sections.push({
      id: WORLD_ANCHORS.placeMap,
      title: strings.worldPlaceInfoLocation,
      body: (
        <WorldMap
          map={map}
          numbered={false}
          label={fillTemplate(strings.worldPlaceMapLabel, { name: entity.name })}
          caption={<WikidataSource href={source} label={strings.worldMapCoordinates} />}
        />
      ),
    });
  }

  sections.push(
    ...buildEntityTextSections(
      [
        {
          id: WORLD_ANCHORS.placeSignificance,
          title: strings.worldPlaceSignificanceTitle,
          text: entity.significance,
        },
        {
          id: WORLD_ANCHORS.placeDescription,
          title: strings.worldPlaceDescriptionTitle,
          text: entity.description,
        },
      ],
      textLinks
    )
  );

  // Цитаты места: говорящий - только герой (`speakerKey`, F08-12a); нет имени - без подписи.
  const quotes = buildEntityQuotesSection(input, strings.worldPlaceQuotesTitle, (q) =>
    q.speakerKey ? people.get(q.speakerKey)?.name : undefined
  );
  if (quotes) sections.push(quotes);

  const scenes = buildEntityScenesSection(input, strings.worldPlaceScenesTitle);
  if (scenes) sections.push(scenes);

  const presence = buildEntityPresenceSection(input);
  if (presence) sections.push(presence);

  const faq = buildEntityFaqSection(input);
  if (faq) sections.push(faq);
  return sections;
}
