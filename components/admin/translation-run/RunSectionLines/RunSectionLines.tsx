import type { FC } from 'react';
import type { SupportedLang } from '@/lib/i18n/lang';
import type {
  TranslationRunAnalysis,
  TranslationRunLanguageStatus,
  TranslationRunSummary,
} from '@/types/api-schema';
import { AnalysisLineView } from '../AnalysisLineView';
import { SummaryLineView } from '../SummaryLineView';

export interface RunSectionLinesProps {
  writeSummary: boolean;
  writeAnalysis: boolean;
  language: {
    status: TranslationRunLanguageStatus;
    summary: TranslationRunSummary | null;
    analysis: TranslationRunAnalysis | null;
  };
  draftVersionId: string | null;
  lang: SupportedLang;
  /** Класс строки (приглушённая в истории). */
  className?: string;
}

/**
 * Строки включённых у запуска разделов языка — Summary и Analysis — каждая своей строкой; одно
 * место на ход и историю запуска (F06-5b, F07-3b).
 */
export const RunSectionLines: FC<RunSectionLinesProps> = ({
  writeSummary,
  writeAnalysis,
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
  </>
);
