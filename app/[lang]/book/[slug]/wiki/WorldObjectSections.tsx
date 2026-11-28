import type { ReactNode } from 'react';
import { hasText } from '@/lib/book-analysis/format';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import { WORLD_ANCHORS } from './wikiAnchors';
import { buildEntityFaqSection, buildEntityQuotesSection } from './WorldEntityMore';
import {
  buildEntityPresenceSection,
  buildEntityScenesSection,
  buildEntityTextSections,
} from './WorldEntityParts';
import { WorldPersonRef } from './WorldPersonRef';
import { withSpoilerGate } from './worldSpoiler';
import { worldThemeItems } from './worldThemes';
import analysisStyles from '../analysis/analysis.module.scss';
import { Paragraphs } from '../analysis/AnalysisBlocks';

/**
 * Последняя глава сцен события среди глав версии (решение арбитра `F08 | F08-13c` Q6): под её
 * островом - значение, которое несёт исход. Глава сцены вне `chapterNumbers` не берётся: остров
 * такой главы не ставится (`withSpoilerGate`), и значение вышло бы открытым. Сцен с главой версии
 * нет - `null`, острова нет.
 */
export function lastSceneChapter(input: WorldEntitySectionsInput): number | null {
  const inVersion = new Set(input.chapterNumbers);
  const chapters = (input.entity.scenes ?? [])
    .map((s) => s.chapter)
    .filter((n) => inVersion.has(n));
  return chapters.length === 0 ? null : Math.max(...chapters);
}

/**
 * Связи (решение арбитра `F08 | F08-13c` Q5): герои мира - ссылкой только при своей странице
 * (`people`), темы анализа - названием из текущего анализа со ссылкой на карточку своей темы
 * (`theme-{key}`, `F08 | F08-13` Q7; страницы анализа нет - текстом); ключа нет ни среди героев,
 * ни в анализе - пункта нет. Ничего нет - раздела нет.
 */
function buildLinksSection(input: WorldEntitySectionsInput): PageSection | null {
  const { entity, strings, people, links, themeTitles } = input;
  const heroes = (entity.characterKeys ?? []).flatMap((key) => {
    const person = people.get(key);
    return person ? [{ key, person }] : [];
  });
  const themes = worldThemeItems(entity.themeKeys, themeTitles, links.analysis);
  if (heroes.length === 0 && themes.length === 0) return null;
  const rows: { label: string; items: ReactNode[] }[] = [];
  if (heroes.length > 0) {
    rows.push({
      label: strings.worldObjectCharacters,
      items: heroes.map(({ key, person }) => <WorldPersonRef key={key} person={person} />),
    });
  }
  if (themes.length > 0) {
    rows.push({
      label: strings.worldObjectThemes,
      items: themes,
    });
  }
  return {
    id: WORLD_ANCHORS.objectLinks,
    title: strings.worldObjectLinksTitle,
    body: (
      <dl className={analysisStyles.facts}>
        {rows.map((row) => (
          <div key={row.label} className={analysisStyles.fact}>
            <dt>{row.label}</dt>
            <dd>
              {row.items.map((item, i) => (
                <span key={i}>
                  {i > 0 ? ', ' : null}
                  {item}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    ),
  };
}

/**
 * Разделы страницы предмета, понятия и события (`product.md` §7; решения арбитра `F08 | F08-13c`
 * Q1, Q5, Q6) по каркасу места: «Коротко» → значение → описание (предмет) → цитаты → сцены
 * (событие) → связи → где появляется → частые вопросы (предмет). Раздел без данных не собирается
 * (§1 п.5): какие поля у типа есть, решает бэкенд (`F08 | F08-13` Q1). У события значение - под
 * островом последней главы сцен, сцены и цитаты - каждая под островом своей главы.
 */
export function buildObjectSections(input: WorldEntitySectionsInput): PageSection[] {
  const { entity, strings, textLinks, people } = input;
  const sections: PageSection[] = [];

  if (hasText(entity.short)) {
    sections.push({
      id: WORLD_ANCHORS.short,
      title: strings.worldShortTitle,
      body: (
        <div className={analysisStyles.mainIdea}>
          <Paragraphs text={entity.short} links={textLinks} />
        </div>
      ),
    });
  }

  const outcome = entity.type === 'event' ? lastSceneChapter(input) : null;
  const texts = buildEntityTextSections(
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
  ).map((section) =>
    outcome !== null && section.id === WORLD_ANCHORS.placeSignificance
      ? { ...section, body: withSpoilerGate(input, outcome, section.body) }
      : section
  );
  sections.push(...texts);

  // Говорящий - только герой (`speakerKey`); нет имени - без подписи.
  const quotes = buildEntityQuotesSection(input, strings.worldQuotesTitle, (q) =>
    q.speakerKey ? people.get(q.speakerKey)?.name : undefined
  );
  if (quotes) sections.push(quotes);

  const scenes = buildEntityScenesSection(input, strings.worldEventScenesTitle);
  if (scenes) sections.push(scenes);

  const links = buildLinksSection(input);
  if (links) sections.push(links);

  // «Где появляется» у события - по его главам (формы ∪ сцены, R2 `F08 | F08-13a`).
  const presence = buildEntityPresenceSection(input, strings.worldObjectPresenceTitle);
  if (presence) sections.push(presence);

  const faq = buildEntityFaqSection(input);
  if (faq) sections.push(faq);
  return sections;
}
