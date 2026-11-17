import Link from 'next/link';
import { QuotesBlock, type QuoteItem } from '@/components/common/QuotesBlock/QuotesBlock';
import { hasText, splitParagraphs } from '@/lib/book-analysis/format';
import { WORLD_CO_PRESENCE_LIMIT } from '@/lib/book-world/format';
import type { WorldEntitySectionsInput, WorldPerson } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import type { BookWorldCoPresence } from '@/types/api-schema';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import { WorldPersonRef } from './WorldPersonRef';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef, Paragraphs } from '../analysis/AnalysisBlocks';

/**
 * Разделы о герое в книге (`product.md` §5 п.9-п.11): ключевые сцены со ссылками «Читать сцену» и
 * «Слушать», отношения и совместное присутствие, цитаты. Раздел без данных не собирается.
 * `coPresence` - соседи, уже отобранные среди публичных героев.
 */
export function buildEntityStorySections(
  input: WorldEntitySectionsInput,
  coPresence: readonly BookWorldCoPresence[]
): PageSection[] {
  const { entity, strings, linker, people } = input;
  const sections: PageSection[] = [];

  const scenes = entity.scenes ?? [];
  if (scenes.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.scenes,
      title: strings.worldScenesTitle,
      body: (
        <ul className={analysisStyles.cards}>
          {scenes.map((scene, i) => {
            const readHref = input.readerHref(scene.chapter);
            // «Слушать» - на аудиоглаву того же номера, только если она есть (Q6).
            const listenHref =
              input.listenHref && input.audioChapters.has(scene.chapter)
                ? input.listenHref(scene.chapter)
                : null;
            return (
              <li key={`${scene.chapter}-${i}`} className={analysisStyles.card}>
                <h3 className={analysisStyles.cardTitle}>{scene.title}</h3>
                <p className={analysisStyles.cardMeta}>
                  <ChapterRef n={scene.chapter} linker={linker} />
                </p>
                <div className={analysisStyles.text}>
                  <Paragraphs text={scene.text} />
                </div>
                {readHref || listenHref ? (
                  <p className={styles.sceneActions}>
                    {readHref ? (
                      <Link href={readHref} prefetch={false} className={analysisStyles.textLink}>
                        {strings.worldReadScene}
                      </Link>
                    ) : null}
                    {listenHref ? (
                      <Link href={listenHref} prefetch={false} className={analysisStyles.textLink}>
                        {strings.worldListenScene}
                      </Link>
                    ) : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ),
    });
  }

  // Связь выводится, только если у цели есть имя (публичный герой или герой анализа): сырой ключ
  // непубличной сущности читателю не показывается (§1 п.9).
  const relations = (entity.relations ?? []).flatMap((r) => {
    const person = people.get(r.to);
    return hasText(r.label) && person ? [{ label: r.label, to: r.to, person }] : [];
  });
  const neighbours = coPresence.slice(0, WORLD_CO_PRESENCE_LIMIT).flatMap((c) => {
    const person: WorldPerson | undefined = people.get(c.key);
    return person ? [{ key: c.key, person }] : [];
  });
  if (relations.length > 0 || neighbours.length > 0) {
    sections.push({
      id: WORLD_ANCHORS.relations,
      title: strings.worldRelationsTitle,
      body: (
        <>
          {relations.length > 0 ? (
            <ul className={styles.plainList}>
              {relations.map((r, i) => (
                <li key={`${r.to}-${i}`}>
                  {r.label} → <WorldPersonRef person={r.person} />
                </li>
              ))}
            </ul>
          ) : null}
          {neighbours.length > 0 ? (
            <>
              <h3 className={analysisStyles.subTitle}>{strings.worldCoPresenceTitle}</h3>
              <ul className={styles.plainList}>
                {neighbours.map((c) => (
                  <li key={c.key}>
                    <WorldPersonRef person={c.person} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ),
    });
  }

  const quotes = entity.quotes ?? [];
  if (quotes.length > 0) {
    const items: QuoteItem[] = quotes.map((q) => {
      const speaker = q.speakerKey ? people.get(q.speakerKey)?.name : undefined;
      return {
        text: q.text,
        ...(speaker ? { author: speaker } : {}),
        comment: splitParagraphs(q.interpretation),
        extra: (
          <p className={analysisStyles.quoteMeta}>
            <ChapterRef n={q.chapter} linker={linker} />
          </p>
        ),
      };
    });
    sections.push({
      id: WORLD_ANCHORS.quotes,
      title: strings.worldQuotesTitle,
      standalone: true,
      body: (
        <QuotesBlock
          id={WORLD_ANCHORS.quotes}
          title={strings.worldQuotesTitle}
          items={items}
          className={analysisStyles.quotesSection}
        />
      ),
    });
  }

  return sections;
}
