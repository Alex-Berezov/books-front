import type { ReactNode } from 'react';
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
import { isFaqItem, type analysisSectionFlags } from '@/lib/book-analysis/format';
import type { AnalysisStrings } from '@/lib/i18n/analysisStrings';
import type { BookAnalysisDetail } from '@/types/api-schema';
import styles from './analysis.module.scss';
import { ANALYSIS_ANCHORS } from './analysisAnchors';
import { Paragraphs, type ChapterLinker } from './AnalysisBlocks';
import {
  AdaptationsList,
  ContextBlock,
  DiscussionList,
  MisreadingsList,
  SourcesList,
  StyleList,
} from './AnalysisLowerBlocks';

/** Раздел страницы анализа: `standalone` - раздел рисует свой заголовок сам (общий блок). */
export interface AnalysisSection {
  id: string;
  title: string;
  body: ReactNode;
  standalone?: boolean;
}

/**
 * Разделы низа страницы анализа (`product.md` §3, блоки 13-20) в порядке спецификации: контекст,
 * стиль, восприятие, экранизации, ошибки понимания, вопросы, FAQ, источники. Только разделы
 * с данными (флаги `analysisSectionFlags`, §1.4); оглавление строит `AnalysisSections` из того же списка.
 */
export function buildLowerSections({
  analysis,
  linker,
  strings,
  faqTitle,
  has,
}: {
  analysis: BookAnalysisDetail;
  linker: ChapterLinker;
  strings: AnalysisStrings;
  faqTitle: string;
  has: ReturnType<typeof analysisSectionFlags>;
}): AnalysisSection[] {
  const out: AnalysisSection[] = [];
  if (has.context) {
    out.push({
      id: ANALYSIS_ANCHORS.context,
      title: strings.analysisContextTitle,
      body: (
        <ContextBlock
          text={analysis.context}
          timeline={analysis.timeline}
          timelineTitle={strings.analysisTimelineTitle}
          kindLabels={{
            author: strings.analysisTimelineAuthor,
            epoch: strings.analysisTimelineEpoch,
            book: strings.analysisTimelineBook,
          }}
        />
      ),
    });
  }
  if (has.style) {
    out.push({
      id: ANALYSIS_ANCHORS.style,
      title: strings.analysisStyleTitle,
      body: <StyleList items={analysis.style ?? []} linker={linker} />,
    });
  }
  if (has.reception) {
    out.push({
      id: ANALYSIS_ANCHORS.reception,
      title: strings.analysisReceptionTitle,
      body: (
        <div className={styles.text}>
          <Paragraphs text={analysis.reception} />
        </div>
      ),
    });
  }
  if (has.adaptations) {
    out.push({
      id: ANALYSIS_ANCHORS.adaptations,
      title: strings.analysisAdaptationsTitle,
      body: (
        <AdaptationsList
          items={analysis.adaptations ?? []}
          kindLabels={{
            film: strings.analysisAdaptationFilm,
            series: strings.analysisAdaptationSeries,
            stage: strings.analysisAdaptationStage,
          }}
        />
      ),
    });
  }
  if (has.misreadings) {
    out.push({
      id: ANALYSIS_ANCHORS.misreadings,
      title: strings.analysisMisreadingsTitle,
      body: (
        <MisreadingsList
          items={analysis.misreadings ?? []}
          mythLabel={strings.analysisMisreadingMyth}
          truthLabel={strings.analysisMisreadingTruth}
        />
      ),
    });
  }
  if (has.discussion) {
    out.push({
      id: ANALYSIS_ANCHORS.discussion,
      title: strings.analysisDiscussionTitle,
      body: <DiscussionList questions={analysis.discussionQuestions ?? []} />,
    });
  }
  if (has.faq) {
    // Тот же блок, что у пересказа, но без FAQPage (§19, §22): на странице только Article и крошки.
    out.push({
      id: ANALYSIS_ANCHORS.faq,
      title: faqTitle,
      standalone: true,
      body: (
        <FaqBlock
          id={ANALYSIS_ANCHORS.faq}
          items={(analysis.faq ?? []).filter(isFaqItem)}
          title={faqTitle}
          showJsonLd={false}
          className={styles.faqSection}
        />
      ),
    });
  }
  if (has.sources) {
    out.push({
      id: ANALYSIS_ANCHORS.sources,
      title: strings.analysisSourcesTitle,
      body: <SourcesList items={analysis.sources ?? []} />,
    });
  }
  return out;
}
