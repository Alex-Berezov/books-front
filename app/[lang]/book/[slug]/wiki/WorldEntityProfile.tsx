import { Fragment, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { hasText } from '@/lib/book-analysis/format';
import { fillTemplate, isLastThirdChapter, presenceChapters } from '@/lib/book-world/format';
import { worldImageSize } from '@/lib/book-world/image';
import { analysisRoleLabels } from '@/lib/i18n/analysisStrings';
import { isOptimizableHost } from '@/lib/utils/image-host';
import type { WorldEntitySectionsInput } from './worldEntityTypes';
import type { PageSection } from '../analysis/PageSections';
import styles from './wiki.module.scss';
import { WORLD_ANCHORS } from './wikiAnchors';
import { buildEntityShortSection } from './WorldEntityMore';
import { withSpoilerGate } from './worldSpoiler';
import analysisStyles from '../analysis/analysis.module.scss';
import { ChapterRef, Paragraphs } from '../analysis/AnalysisBlocks';
import { ThemeStrip } from '../analysis/ThemeStrip';
import { LinkedText } from '../LinkedText';

/** Глава первого появления: поле списка, иначе первая глава упоминаний; нет - `null`. */
export function entityFirstChapter(entity: WorldEntitySectionsInput['entity']): number | null {
  return entity.mentionFirst ?? entity.mentions?.first ?? null;
}

/**
 * Разделы о самом герое (`product.md` §5 п.4-п.8): инфобокс, «Коротко», присутствие по главам,
 * внешность, характер, путь. Раздел без данных не собирается.
 */
export function buildEntityProfileSections(input: WorldEntitySectionsInput): PageSection[] {
  const { entity, chapterNumbers, strings, analysisStrings, linker, textLinks } = input;
  const sections: PageSection[] = [];
  const roleLabels = analysisRoleLabels(analysisStrings);

  const present = presenceChapters(entity.mentions?.chapters, chapterNumbers);
  const firstChapter = entityFirstChapter(entity);

  // Инфобокс (п.4): только строки со значением.
  const infoRows: { label: string; value: ReactNode }[] = [];
  if (entity.role) infoRows.push({ label: strings.worldInfoRole, value: roleLabels[entity.role] });
  if (hasText(entity.profile?.position)) {
    infoRows.push({ label: strings.worldInfoPosition, value: entity.profile?.position });
  }
  if (hasText(entity.profile?.relationToMain)) {
    infoRows.push({ label: strings.worldInfoRelation, value: entity.profile?.relationToMain });
  }
  if (firstChapter !== null) {
    infoRows.push({
      label: strings.worldInfoFirst,
      value: <ChapterRef n={firstChapter} linker={linker} />,
    });
  }
  if (present.length > 0) {
    infoRows.push({ label: strings.worldInfoChapters, value: present.length });
  }
  const { illustration } = input;
  if (infoRows.length > 0 || illustration) {
    sections.push({
      id: WORLD_ANCHORS.about,
      title: strings.worldInfoboxTitle,
      body: (
        <>
          {illustration ? (
            <figure className={styles.illustration}>
              <Image
                src={illustration.image.url}
                alt={illustration.alt}
                {...worldImageSize(illustration.image)}
                sizes="100vw"
                unoptimized={!isOptimizableHost(illustration.image.url)}
                className={styles.illustrationImage}
              />
              <figcaption className={styles.illustrationCaption}>
                <Link href={illustration.policyHref}>{illustration.caption}</Link>
              </figcaption>
            </figure>
          ) : null}
          {infoRows.length > 0 ? (
            <dl className={analysisStyles.facts}>
              {infoRows.map((row) => (
                <div key={row.label} className={analysisStyles.fact}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </>
      ),
    });
  }

  const short = buildEntityShortSection(input);
  if (short) sections.push(short);

  if (present.length > 0) {
    sections.push({
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
    });
  }

  const texts = [
    { id: WORLD_ANCHORS.appearance, title: strings.worldAppearanceTitle, text: entity.appearance },
    { id: WORLD_ANCHORS.character, title: strings.worldCharacterTitle, text: entity.character },
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

  const arc = entity.arc;
  const stages = arc?.stages ?? [];
  if (arc && (hasText(arc.from) || hasText(arc.to) || stages.length > 0)) {
    sections.push({
      id: WORLD_ANCHORS.arc,
      title: strings.worldArcTitle,
      body: (
        <>
          {hasText(arc.from) || hasText(arc.to) ? (
            <dl className={analysisStyles.arc}>
              {hasText(arc.from) ? (
                <Fragment>
                  <dt>{analysisStrings.analysisArcFrom}</dt>
                  <dd>
                    <LinkedText text={arc.from} links={textLinks} />
                  </dd>
                </Fragment>
              ) : null}
              {hasText(arc.to) ? (
                <Fragment>
                  <dt>{analysisStrings.analysisArcTo}</dt>
                  <dd>
                    <LinkedText text={arc.to} links={textLinks} />
                  </dd>
                </Fragment>
              ) : null}
            </dl>
          ) : null}
          {stages.length > 0 ? (
            <ol className={analysisStyles.timeline}>
              {stages.map((stage, i) => (
                <li key={`${stage.chapter}-${i}`} className={analysisStyles.timelineItem}>
                  {withSpoilerGate(
                    input,
                    stage.chapter,
                    <>
                      <h3 className={analysisStyles.subTitle}>
                        {stage.title}
                        {isLastThirdChapter(stage.chapter, chapterNumbers) ? (
                          <span className={styles.spoilerTag}>{strings.worldStageSpoiler}</span>
                        ) : null}
                      </h3>
                      <p className={analysisStyles.cardMeta}>
                        <ChapterRef n={stage.chapter} linker={linker} />
                      </p>
                      <div className={analysisStyles.text}>
                        <Paragraphs text={stage.text} links={textLinks} />
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ),
    });
  }

  return sections;
}
