import type { FC } from 'react';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  TranslationRunAnalysis,
  TranslationRunLanguageStatus,
  TranslationRunSummary,
  TranslationRunWorld,
} from '@/types/api-schema';
import { AnalysisLineView } from '../AnalysisLineView';
import { SectionLineView } from '../SectionLineView';
import { SummaryLineView } from '../SummaryLineView';
import { worldLineOf } from '../worldLine.utils';

export interface RunSectionLinesProps {
  writeSummary: boolean;
  writeAnalysis: boolean;
  writeWorld: boolean;
  language: {
    status: TranslationRunLanguageStatus;
    summary: TranslationRunSummary | null;
    analysis: TranslationRunAnalysis | null;
    world: TranslationRunWorld | null;
  };
  draftVersionId: string | null;
  lang: SupportedLang;
  /** Класс строки (приглушённая в истории). */
  className?: string;
}

/**
 * Строки включённых у запуска разделов языка — Summary, Analysis и World — каждая своей строкой;
 * одно место на ход и историю запуска (F06-5b, F07-3b, F08-9b).
 */
export const RunSectionLines: FC<RunSectionLinesProps> = ({
  writeSummary,
  writeAnalysis,
  writeWorld,
  language,
  draftVersionId,
  lang,
  className,
}) => (
  <>
    {writeSummary && (
      <div className={className}>
        <SummaryLineView
          writeSummary
          language={language}
          draftVersionId={draftVersionId}
          lang={lang}
        />
      </div>
    )}
    {writeAnalysis && (
      <div className={className}>
        <AnalysisLineView
          writeAnalysis
          language={language}
          draftVersionId={draftVersionId}
          lang={lang}
        />
      </div>
    )}
    {writeWorld && (
      <div className={className}>
        <SectionLineView
          // `?? null`: ответ прежнего бэкенда поля `world` не несёт вовсе (окно выката, F08-9b).
          line={worldLineOf(true, {
            status: language.status,
            world: language.world ?? null,
            analysis: language.analysis,
          })}
          tab="world"
          draftVersionId={draftVersionId}
          lang={lang}
        />
      </div>
    )}
  </>
);
