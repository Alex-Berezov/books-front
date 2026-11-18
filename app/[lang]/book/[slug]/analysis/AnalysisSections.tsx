import { analysisSectionFlags } from '@/lib/book-analysis/format';
import { buildRelationMap } from '@/lib/book-analysis/relation-map';
import { analysisRoleLabels, type AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { LinkSession } from '@/lib/book-world/link-entities';
import type { BookAnalysisDetail } from '@/types/api-schema';
import styles from './analysis.module.scss';
import { ANALYSIS_ANCHORS } from './analysisAnchors';
import {
  buildThemeIndex,
  CharactersList,
  KeyQuotesSection,
  Paragraphs,
  SpoilerNote,
  SymbolsList,
  ThemesList,
  type ChapterLinker,
} from './AnalysisBlocks';
import { buildLowerSections, type AnalysisSection } from './AnalysisLowerSections';
import { PageSections } from './PageSections';
import { RelationMap } from './RelationMap';
import { WorldHeroesBlock, type WorldHeroesBlockProps } from '../WorldHeroesBlock';

interface AnalysisSectionsProps {
  analysis: BookAnalysisDetail;
  linker: ChapterLinker;
  /** Сессия ссылок страницы (F08-5, решение арбитра Q9); `null` - тексты без перелинковки. */
  links: LinkSession | null;
  strings: AnalysisStrings;
  tocTitle: string;
  /** Заголовок FAQ - тот же, что у пересказа (`book.faqTitle`, §19). */
  faqTitle: string;
  /** «Подробнее о герое» на карточке героя (F08-5). */
  characterMore: string;
  /** «Герои книги» (F08-5, решение арбитра Q10): герои, уже отобранные страницей (`pickBookHeroes`). */
  heroes: Omit<WorldHeroesBlockProps, 'id' | 'links'>;
}

/**
 * Оглавление и разделы под главной мыслью (`product.md` §3, блоки 6-20): темы с полосой глав,
 * персонажи с картой отношений, символы, ключевые цитаты, смысл названия и финала, контекст,
 * стиль, восприятие, экранизации, ошибки понимания, вопросы, FAQ, источники. Раздел без данных
 * не выводится вовсе (§1.4), оглавление строится из того же списка, что и разделы.
 */
export function AnalysisSections({
  analysis,
  linker,
  links,
  strings,
  tocTitle,
  faqTitle,
  characterMore,
  heroes,
}: AnalysisSectionsProps) {
  const themes = analysis.themes ?? [];
  const characters = analysis.characters ?? [];
  const symbols = analysis.symbols ?? [];
  const keyQuotes = analysis.keyQuotes ?? [];
  const themeIndex = buildThemeIndex(themes);
  const has = analysisSectionFlags(analysis);
  const speakers = new Map(characters.map((c) => [c.key, c.name]));
  const relationMap = has.characters ? buildRelationMap(characters) : null;

  // `standalone` - раздел рисует свой заголовок сам (общий `QuotesBlock`).
  const sections: AnalysisSection[] = [];
  if (has.themes) {
    sections.push({
      id: ANALYSIS_ANCHORS.themes,
      title: strings.analysisThemesTitle,
      body: (
        <ThemesList
          themes={themes}
          linker={linker}
          links={links}
          chapterNumbers={analysis.chapterNumbers}
          stripLabels={{
            strip: strings.analysisThemeStripLabel,
            chapters: strings.analysisChapters,
          }}
        />
      ),
    });
  }
  if (has.characters) {
    sections.push({
      id: ANALYSIS_ANCHORS.characters,
      title: strings.analysisCharactersTitle,
      body: (
        <>
          {relationMap ? (
            <RelationMap map={relationMap} title={strings.analysisRelationsTitle} />
          ) : null}
          <CharactersList
            characters={characters}
            themes={themeIndex}
            linker={linker}
            links={links}
            labels={{
              roles: analysisRoleLabels(strings),
              arcFrom: strings.analysisArcFrom,
              arcTo: strings.analysisArcTo,
              themeTags: strings.analysisThemeTags,
              more: characterMore,
            }}
          />
        </>
      ),
    });
  }
  if (has.symbols) {
    sections.push({
      id: ANALYSIS_ANCHORS.symbols,
      title: strings.analysisSymbolsTitle,
      body: (
        <SymbolsList
          symbols={symbols}
          linker={linker}
          links={links}
          chaptersLabel={strings.analysisChapters}
        />
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
          links={links}
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
          <Paragraphs text={analysis.titleMeaning} links={links} />
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
            <Paragraphs text={analysis.endingMeaning} links={links} />
          </div>
        </>
      ),
    });
  }

  // «Герои книги» - перед нижними разделами (решение арбитра Q10); героев нет - раздела нет.
  if (heroes.heroes.length > 0) {
    sections.push({
      id: ANALYSIS_ANCHORS.heroes,
      title: heroes.title,
      standalone: true,
      body: <WorldHeroesBlock id={ANALYSIS_ANCHORS.heroes} {...heroes} links={links} />,
    });
  }

  sections.push(...buildLowerSections({ analysis, linker, links, strings, faqTitle, has }));

  return <PageSections sections={sections} tocTitle={tocTitle} tocId="analysis-toc-title" />;
}
