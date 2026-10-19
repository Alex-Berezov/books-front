import { Fragment, type ReactNode } from 'react';
import { analysisSectionFlags } from '@/lib/book-analysis/format';
import type { AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { BookAnalysisDetail } from '@/types/api-schema';
import styles from './analysis.module.scss';
import { ANALYSIS_ANCHORS } from './analysisAnchors';
import {
  buildThemeIndex,
  CharactersList,
  KeyQuotesSection,
  Paragraphs,
  Section,
  SpoilerNote,
  SymbolsList,
  ThemesList,
  type ChapterLinker,
} from './AnalysisBlocks';

interface AnalysisSectionsProps {
  analysis: BookAnalysisDetail;
  linker: ChapterLinker;
  strings: AnalysisStrings;
  tocTitle: string;
}

/**
 * Оглавление и разделы под главной мыслью (`product.md` §3, блоки 6-12): темы, персонажи,
 * символы, ключевые цитаты, смысл названия и финала. Раздел без данных не выводится вовсе (§1.4),
 * оглавление строится из того же списка, что и разделы. Блоки §13-§20 добавляет F03-3.
 */
export function AnalysisSections({ analysis, linker, strings, tocTitle }: AnalysisSectionsProps) {
  const themes = analysis.themes ?? [];
  const characters = analysis.characters ?? [];
  const symbols = analysis.symbols ?? [];
  const keyQuotes = analysis.keyQuotes ?? [];
  const themeIndex = buildThemeIndex(themes);
  const has = analysisSectionFlags(analysis);
  const speakers = new Map(characters.map((c) => [c.key, c.name]));

  // `standalone` - раздел рисует свой заголовок сам (общий `QuotesBlock`).
  const sections: { id: string; title: string; body: ReactNode; standalone?: boolean }[] = [];
  if (has.themes) {
    sections.push({
      id: ANALYSIS_ANCHORS.themes,
      title: strings.analysisThemesTitle,
      body: <ThemesList themes={themes} linker={linker} />,
    });
  }
  if (has.characters) {
    sections.push({
      id: ANALYSIS_ANCHORS.characters,
      title: strings.analysisCharactersTitle,
      body: (
        <CharactersList
          characters={characters}
          themes={themeIndex}
          linker={linker}
          labels={{
            roles: {
              main: strings.analysisRoleMain,
              secondary: strings.analysisRoleSecondary,
              minor: strings.analysisRoleMinor,
            },
            arcFrom: strings.analysisArcFrom,
            arcTo: strings.analysisArcTo,
            themeTags: strings.analysisThemeTags,
          }}
        />
      ),
    });
  }
  if (has.symbols) {
    sections.push({
      id: ANALYSIS_ANCHORS.symbols,
      title: strings.analysisSymbolsTitle,
      body: (
        <SymbolsList symbols={symbols} linker={linker} chaptersLabel={strings.analysisChapters} />
      ),
    });
  }
  if (has.keyQuotes) {
    sections.push({
      id: ANALYSIS_ANCHORS.keyQuotes,
      title: strings.analysisKeyQuotesTitle,
      standalone: true,
      body: (
        <KeyQuotesSection
          id={ANALYSIS_ANCHORS.keyQuotes}
          title={strings.analysisKeyQuotesTitle}
          quotes={keyQuotes}
          speakers={speakers}
          themes={themeIndex}
          linker={linker}
          themeTagsLabel={strings.analysisThemeTags}
        />
      ),
    });
  }
  if (has.titleMeaning) {
    sections.push({
      id: ANALYSIS_ANCHORS.titleMeaning,
      title: strings.analysisTitleMeaningTitle,
      body: (
        <div className={styles.text}>
          <Paragraphs text={analysis.titleMeaning} />
        </div>
      ),
    });
  }
  if (has.endingMeaning) {
    sections.push({
      id: ANALYSIS_ANCHORS.endingMeaning,
      title: strings.analysisEndingMeaningTitle,
      body: (
        <>
          <SpoilerNote text={strings.analysisEndingSpoiler} />
          <div className={styles.text}>
            <Paragraphs text={analysis.endingMeaning} />
          </div>
        </>
      ),
    });
  }

  if (sections.length === 0) return null;

  return (
    <>
      <nav className={styles.toc} aria-labelledby="analysis-toc-title">
        <p id="analysis-toc-title" className={styles.tocTitle}>
          {tocTitle}
        </p>
        <ol className={styles.tocList}>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.title}</a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((s) =>
        s.standalone ? (
          <Fragment key={s.id}>{s.body}</Fragment>
        ) : (
          <Section key={s.id} id={s.id} title={s.title}>
            {s.body}
          </Section>
        )
      )}
    </>
  );
}
