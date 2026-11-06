import type { FC } from 'react';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationRunAnalysis, TranslationRunLanguageStatus } from '@/types/api-schema';
import { analysisLineOf } from '../analysisLine.utils';
import { SectionLineView } from '../SectionLineView';

export interface AnalysisLineViewProps {
  writeAnalysis: boolean;
  language: { status: TranslationRunLanguageStatus; analysis: TranslationRunAnalysis | null };
  /** Версия языка: вкладка Analysis живёт на её странице. */
  draftVersionId: string | null;
  lang: SupportedLang;
}

/** Строка анализа языка запуска со ссылкой на вкладку Analysis там, где за ней нужно идти. */
export const AnalysisLineView: FC<AnalysisLineViewProps> = ({
  writeAnalysis,
  language,
  draftVersionId,
  lang,
}) => (
  <SectionLineView
    line={analysisLineOf(writeAnalysis, language)}
    tab="analysis"
    draftVersionId={draftVersionId}
    lang={lang}
  />
);
