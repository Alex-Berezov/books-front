import Link from 'next/link';
import { hasText } from '@/lib/book-analysis/format';
import type { WorldIndexSectionsInput } from './WorldIndexSections';
import type { PageSection } from '../analysis/PageSections';
import type { BookWorldObjectCard } from '@/types/api-schema';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef, Paragraphs } from '../analysis/AnalysisBlocks';
import { LinkedMark, LinkedText } from '../LinkedText';

/** Карточки предметов, понятий и событий общей страницы (`F08-13c`); старый бэкенд полей не отдаёт. */
export interface WorldIndexObjectCards {
  objects: readonly BookWorldObjectCard[];
  terms: readonly BookWorldObjectCard[];
  events: readonly BookWorldObjectCard[];
}

/** Имя карточки: ссылкой только при своей странице (решения `F08 | F08-13c` Q2, Q3). */
function cardName(card: BookWorldObjectCard, input: WorldIndexSectionsInput) {
  return card.hasPage ? (
    <Link href={input.entityHref(card.key)} className={analysisStyles.textLink}>
      {card.name}
    </Link>
  ) : (
    card.name
  );
}

/**
 * Список предметов или событий (решения арбитра `F08 | F08-13c` Q2, Q6): имя, «Коротко», «глава N»
 * (у события - первая глава сцен). Сцен в карточке нет; «Коротко» события пишется без исхода
 * (`F08 | F08-13` Q7) и открыто.
 */
function cardList(cards: readonly BookWorldObjectCard[], input: WorldIndexSectionsInput) {
  const { textLinks, linker } = input;
  return (
    <ul className={analysisStyles.cards}>
      {cards.map((card) => (
        <li key={card.key} className={analysisStyles.card}>
          <h3 className={analysisStyles.cardTitle}>{cardName(card, input)}</h3>
          {hasText(card.short) ? (
            <div className={analysisStyles.text}>
              <Paragraphs
                text={card.short}
                links={textLinks}
                linkedKey={card.hasPage ? card.key : undefined}
              />
            </div>
          ) : card.hasPage ? (
            <LinkedMark links={textLinks} entityKey={card.key} />
          ) : null}
          {card.chapter !== null ? (
            <p className={analysisStyles.cardMeta}>
              <ChapterRef n={card.chapter} linker={linker} />
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Глоссарий (решения арбитра `F08 | F08-13c` Q3, Q4): одна строка на понятие в порядке бэкенда -
 * «термин — определение — глава N»; без определения - «термин — глава N», без главы - только термин.
 * Понятие со страницей - ссылкой.
 */
function glossary(terms: readonly BookWorldObjectCard[], input: WorldIndexSectionsInput) {
  const { strings, linker, textLinks } = input;
  const sep = strings.worldPlaceSceneSeparator;
  return (
    <ul className={styles.plainList}>
      {terms.map((term) => (
        <li key={term.key}>
          {term.hasPage ? <LinkedMark links={textLinks} entityKey={term.key} /> : null}
          <strong>{cardName(term, input)}</strong>
          {hasText(term.short) ? (
            <>
              {sep}
              <LinkedText text={term.short} links={textLinks} />
            </>
          ) : null}
          {term.chapter !== null ? (
            <>
              {sep}
              <ChapterRef n={term.chapter} linker={linker} />
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Разделы предметов, глоссария понятий и событий общей страницы (`product.md` §4 п.6, §7;
 * `F08-13c`) - после мест, в порядке §4 п.6: предметы, понятия, события. Раздел без карточек
 * не выводится (§1 п.5).
 */
export function buildObjectIndexSections(
  cards: WorldIndexObjectCards,
  input: WorldIndexSectionsInput
): PageSection[] {
  const { strings } = input;
  const sections: PageSection[] = [];
  if (cards.objects.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.objects,
      title: strings.worldObjectsTitle,
      body: cardList(cards.objects, input),
    });
  }
  if (cards.terms.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.glossary,
      title: strings.worldGlossaryTitle,
      body: glossary(cards.terms, input),
    });
  }
  if (cards.events.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.events,
      title: strings.worldEventsTitle,
      body: cardList(cards.events, input),
    });
  }
  return sections;
}
