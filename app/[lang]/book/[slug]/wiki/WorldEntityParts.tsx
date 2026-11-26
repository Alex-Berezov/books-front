import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { hasText } from '@/lib/book-analysis/format';
import { fillTemplate, presenceChapters } from '@/lib/book-world/format';
import { worldImageSize } from '@/lib/book-world/image';
import { isOptimizableHost } from '@/lib/utils/image-host';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import { withSpoilerGate } from './worldSpoiler';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef, Paragraphs } from '../analysis/AnalysisBlocks';
import { ThemeStrip } from '../analysis/ThemeStrip';

/*
 * Общие части страниц мира (F08-12c): из них собирают разделы и герой (`WorldEntityProfile`,
 * `WorldEntityStory`), и место (`WorldPlaceSections`). Здесь только то, что не завязано на тип
 * сущности; разделы одного типа живут в файле этого типа.
 */

/** Принятая иллюстрация сущности с подписью-ссылкой на редполитику (F08-11c): у героя и места (F08-12c-2). */
export function WorldIllustrationFigure({
  illustration,
}: {
  illustration: NonNullable<WorldEntitySectionsInput['illustration']>;
}) {
  return (
    <figure className={styles.illustration}>
      <Image
        src={illustration.image.url}
        alt={illustration.alt}
        {...worldImageSize(illustration.image, illustration.entityType)}
        sizes="100vw"
        unoptimized={!isOptimizableHost(illustration.image.url)}
        className={styles.illustrationImage}
      />
      <figcaption className={styles.illustrationCaption}>
        <Link href={illustration.policyHref}>{illustration.caption}</Link>
      </figcaption>
    </figure>
  );
}

/** Строка списка фактов: подпись и значение. */
export interface WorldFact {
  label: string;
  value: ReactNode;
}

/** Список фактов (инфобокс героя, «Коротко» места): только строки со значением. */
export function WorldFacts({ rows }: { rows: readonly WorldFact[] }) {
  return (
    <dl className={analysisStyles.facts}>
      {rows.map((row) => (
        <div key={row.label} className={analysisStyles.fact}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Текстовые разделы сущности (характер, значение места, описание): раздел - абзацы текста
 * с перелинковкой; текста нет - раздела нет (§1 п.5).
 */
export function buildEntityTextSections(
  items: readonly { id: string; title: string; text: string | null | undefined }[],
  textLinks: WorldEntitySectionsInput['textLinks']
): PageSection[] {
  return items.flatMap(({ id, title, text }) =>
    hasText(text)
      ? [
          {
            id,
            title,
            body: (
              <div className={analysisStyles.text}>
                <Paragraphs text={text} links={textLinks} />
              </div>
            ),
          },
        ]
      : []
  );
}

/** Присутствие по главам (`product.md` §5 п.6, у места - §7): посчитанные главы версии; нет - раздела нет. */
export function buildEntityPresenceSection(input: WorldEntitySectionsInput): PageSection | null {
  const { entity, chapterNumbers, strings, analysisStrings, linker } = input;
  const present = presenceChapters(entity.mentions?.chapters, chapterNumbers);
  if (present.length === 0) return null;
  return {
    id: WORLD_ANCHORS.presence,
    title: strings.worldPresenceTitle,
    body: (
      <ThemeStrip
        themeChapters={present}
        chapterNumbers={chapterNumbers}
        linker={linker}
        label={fillTemplate(strings.worldPresenceLabel, { name: entity.name })}
        chaptersLabel={analysisStrings.analysisChapters}
        colorClassName={styles.presenceColor}
      />
    ),
  };
}

/**
 * Ключевые сцены сущности (`product.md` §5 п.9, у места - §7 «что здесь происходит»): глава, текст,
 * «Читать сцену» на абзаце и «Слушать»; каждая сцена - под спойлер-островом своей главы. Сцен нет -
 * раздела нет.
 */
export function buildEntityScenesSection(
  input: WorldEntitySectionsInput,
  title: string
): PageSection | null {
  const { entity, strings, linker, textLinks } = input;
  const scenes = entity.scenes ?? [];
  if (scenes.length === 0) return null;
  return {
    id: WORLD_ANCHORS.scenes,
    title,
    body: (
      <ul className={analysisStyles.cards}>
        {scenes.map((scene, i) => {
          // «Читать сцену» - на абзаце сцены, если ход его нашёл (`F08-10a`).
          const readHref = input.readerHref(scene.chapter, scene.paragraph ?? null);
          // «Слушать» - на аудиоглаву того же номера, только если она есть (Q6).
          const listenHref =
            input.listenHref && input.audioChapters.has(scene.chapter)
              ? input.listenHref(scene.chapter)
              : null;
          return (
            <li key={`${scene.chapter}-${i}`} className={analysisStyles.card}>
              {withSpoilerGate(
                input,
                scene.chapter,
                <>
                  <h3 className={analysisStyles.cardTitle}>{scene.title}</h3>
                  <p className={analysisStyles.cardMeta}>
                    <ChapterRef n={scene.chapter} linker={linker} />
                  </p>
                  <div className={analysisStyles.text}>
                    <Paragraphs text={scene.text} links={textLinks} />
                  </div>
                  {readHref || listenHref ? (
                    <p className={styles.sceneActions}>
                      {readHref ? (
                        <Link href={readHref} prefetch={false} className={analysisStyles.textLink}>
                          {strings.worldReadScene}
                        </Link>
                      ) : null}
                      {listenHref ? (
                        <Link
                          href={listenHref}
                          prefetch={false}
                          className={analysisStyles.textLink}
                        >
                          {strings.worldListenScene}
                        </Link>
                      ) : null}
                    </p>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ul>
    ),
  };
}
