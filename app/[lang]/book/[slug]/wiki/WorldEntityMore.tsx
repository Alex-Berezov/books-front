import Link from 'next/link';
import {
  QuotesBlock,
  quoteCardClassName,
  type QuoteItem,
} from '@/components/common/QuotesBlock/QuotesBlock';
import { hasText, splitParagraphs } from '@/lib/book-analysis/format';
import { fillTemplate, WORLD_NEXT_LIMIT } from '@/lib/book-world/format';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import type { BookWorldCoPresence, BookWorldQuote } from '@/types/api-schema';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import { WorldPersonRef } from './WorldPersonRef';
import { withSpoilerGate } from './worldSpoiler';
import analysisStyles from '../analysis/analysis.module.scss';
import { ANALYSIS_ANCHORS } from '../analysis/analysisAnchors';
import { ChapterRef, Paragraphs } from '../analysis/AnalysisBlocks';
import { SourcesList } from '../analysis/AnalysisLowerBlocks';
import { LinkedMark } from '../LinkedText';

/**
 * Внешние блоки (`product.md` §5 п.12-13): критика, прототипы, экранизации - только при списке
 * источников, и сам список под ними. Без источников внешних блоков нет вовсе.
 */
export function buildEntityExternalSections(input: WorldEntitySectionsInput): PageSection[] {
  const { entity, strings, textLinks } = input;
  const sections: PageSection[] = [];
  const sources = (entity.sources ?? []).filter((s) => hasText(s.url));
  if (sources.length === 0) return sections;

  const texts = [
    { id: WORLD_ANCHORS.critique, title: strings.worldCritiqueTitle, text: entity.critique },
    { id: WORLD_ANCHORS.prototypes, title: strings.worldPrototypesTitle, text: entity.prototypes },
  ];
  for (const { id, title, text } of texts) {
    if (!hasText(text)) continue;
    sections.push({
      id,
      title,
      body: (
        <div className={analysisStyles.text}>
          <Paragraphs text={text} links={textLinks} />
        </div>
      ),
    });
  }

  const adaptations = entity.adaptations ?? [];
  if (adaptations.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.adaptations,
      title: strings.worldAdaptationsTitle,
      body: (
        <ul className={analysisStyles.cards}>
          {adaptations.map((a, i) => (
            <li key={`${a.title}-${i}`} className={analysisStyles.card}>
              <h3 className={analysisStyles.cardTitle}>
                {a.title}
                {a.year ? ` (${a.year})` : ''}
              </h3>
              {hasText(a.actor) ? (
                <p className={analysisStyles.cardMeta}>
                  {fillTemplate(strings.worldAdaptationPlayedBy, { actor: a.actor })}
                </p>
              ) : null}
              <div className={analysisStyles.text}>
                <Paragraphs text={a.differences} links={textLinks} />
              </div>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (sections.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.sources,
      title: strings.worldSourcesTitle,
      // Готовый список анализа: адрес проходит `isSafeHref` (`ui-kit.md`, `LEGACY-447`).
      body: <SourcesList items={sources} />,
    });
  }
  return sections;
}

/** «Коротко» (§5 п.5, у пары - `product.md` §6): «Коротко» сущности; нет текста - раздела нет. */
export function buildEntityShortSection(input: WorldEntitySectionsInput): PageSection | null {
  const { entity, strings, textLinks } = input;
  if (!hasText(entity.short)) return null;
  return {
    id: WORLD_ANCHORS.short,
    title: strings.worldShortTitle,
    body: (
      <div className={analysisStyles.mainIdea}>
        <Paragraphs text={entity.short} links={textLinks} />
      </div>
    ),
  };
}

/**
 * Цитаты сущности (§5 п.11, у пары - `product.md` §6): текст, подпись автора, толкование и глава.
 * Подпись даёт `authorOf` (герой - имя говорящего, пара - «кто → о ком»); `undefined` - без подписи.
 * Цитат нет - раздела нет.
 */
export function buildEntityQuotesSection(
  input: WorldEntitySectionsInput,
  title: string,
  authorOf: (quote: BookWorldQuote) => string | undefined
): PageSection | null {
  const { entity, linker } = input;
  const quotes = entity.quotes ?? [];
  if (quotes.length === 0) return null;
  const items: QuoteItem[] = quotes.map((q) => {
    const author = authorOf(q);
    return {
      text: q.text,
      ...(author ? { author } : {}),
      comment: splitParagraphs(q.interpretation),
      extra: (
        <p className={analysisStyles.quoteMeta}>
          <ChapterRef n={q.chapter} linker={linker} />
        </p>
      ),
    };
  });
  return {
    id: WORLD_ANCHORS.quotes,
    title,
    standalone: true,
    body: (
      <QuotesBlock
        id={WORLD_ANCHORS.quotes}
        title={title}
        items={items}
        className={analysisStyles.quotesSection}
        wrapItem={(card, index) =>
          withSpoilerGate(input, quotes[index].chapter, card, quoteCardClassName)
        }
      />
    ),
  };
}

/** Частые вопросы о герое (§5 п.14): только пары с вопросом и ответом. */
export function buildEntityFaqSection(input: WorldEntitySectionsInput): PageSection | null {
  const { entity, strings, textLinks } = input;
  const faq = (entity.faq ?? []).filter((f) => hasText(f.question) && hasText(f.answer));
  if (faq.length === 0) return null;
  return {
    id: WORLD_ANCHORS.faq,
    title: fillTemplate(strings.worldFaqTitle, { name: entity.name }),
    body: (
      <>
        {faq.map((f, i) => (
          <div key={i} className={styles.faqItem}>
            <h3 className={analysisStyles.subTitle}>{f.question}</h3>
            <div className={analysisStyles.text}>
              <Paragraphs text={f.answer} links={textLinks} />
            </div>
          </div>
        ))}
      </>
    ),
  };
}

/**
 * «Дальше» (§5 п.15): до 6 соседних героев карточками, «Анализ: темы» - на раздел тем анализа
 * (тем у анализа нет - ссылка на анализ без якоря), пересказ и чтение главы первого появления.
 */
export function buildEntityNextSection(
  input: WorldEntitySectionsInput,
  coPresence: readonly BookWorldCoPresence[],
  firstChapter: number | null
): PageSection | null {
  const { entity, strings, people, links, textLinks } = input;
  const next = coPresence.slice(0, WORLD_NEXT_LIMIT).flatMap((c) => {
    const person = people.get(c.key);
    return person ? [{ key: c.key, person }] : [];
  });
  const firstHref = firstChapter !== null ? input.readerHref(firstChapter) : null;
  if (next.length === 0 && !links.analysis && !links.summary && !firstHref) return null;

  return {
    id: WORLD_ANCHORS.next,
    title: strings.worldNextTitle,
    body: (
      <>
        {next.length > 0 ? (
          <ul className={analysisStyles.cards}>
            {next.map(({ key, person }) => (
              <li key={key} className={analysisStyles.card}>
                <h3 className={analysisStyles.cardTitle}>
                  <WorldPersonRef person={person} />
                </h3>
                {hasText(person.short) ? (
                  <div className={analysisStyles.text}>
                    <Paragraphs
                      text={person.short}
                      links={textLinks}
                      linkedKey={person.href ? key : undefined}
                    />
                  </div>
                ) : person.href ? (
                  // Заголовок уже ссылка: отметка нужна и без «Коротко».
                  <LinkedMark links={textLinks} entityKey={key} />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
        <ul className={styles.plainList}>
          {links.analysis ? (
            <li>
              {links.analysisHasThemes ? (
                <Link
                  href={`${links.analysis}#${ANALYSIS_ANCHORS.themes}`}
                  className={analysisStyles.textLink}
                >
                  {strings.worldAnalysisThemes}
                </Link>
              ) : (
                <Link href={links.analysis} className={analysisStyles.textLink}>
                  {strings.worldAnalysisLink}
                </Link>
              )}
            </li>
          ) : null}
          {links.summary ? (
            <li>
              <Link href={links.summary.href} className={analysisStyles.textLink}>
                {links.summary.label}
              </Link>
            </li>
          ) : null}
          {firstHref && firstChapter !== null ? (
            <li>
              <Link href={firstHref} prefetch={false} className={analysisStyles.textLink}>
                {fillTemplate(strings.worldReadFirst, { n: firstChapter, name: entity.name })}
              </Link>
            </li>
          ) : null}
        </ul>
      </>
    ),
  };
}
