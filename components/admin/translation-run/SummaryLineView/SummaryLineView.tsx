import type { FC } from 'react';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { TranslationRunLanguageStatus, TranslationRunSummary } from '@/types/api-schema';
import { SectionLineView } from '../SectionLineView';
import { summaryLineOf } from '../summaryLine.utils';

export interface SummaryLineViewProps {
  writeSummary: boolean;
  language: { status: TranslationRunLanguageStatus; summary: TranslationRunSummary | null };
  /** Версия языка: вкладка Summary живёт на её странице. */
  draftVersionId: string | null;
  lang: SupportedLang;
}

/** Строка раздела языка запуска со ссылкой на вкладку Summary там, где за ней нужно идти. */
export const SummaryLineView: FC<SummaryLineViewProps> = ({
  writeSummary,
  language,
  draftVersionId,
  lang,
}) => (
  <SectionLineView
    line={summaryLineOf(writeSummary, language)}
    tab="summary"
    draftVersionId={draftVersionId}
    lang={lang}
  />
);
