import {
  reasonText,
  refusalTextOfCode,
} from '@/components/admin/books/AnalysisTab/AnalysisWrite/analysisWrite.utils';
import type { TranslationRunAnalysis, TranslationRunLanguageStatus } from '@/types/api-schema';
import {
  type SectionLine,
  type SectionTexts,
  sectionLineOf,
  sectionReasonText,
  sumSectionSpent,
} from './sectionLine.utils';
import { stepFailureText } from './translationRun.utils';

/**
 * Подписи анализа языка запуска (F07-3b, по образцу строки Summary F06-5b): коды автозапуска —
 * своей таблицей, отказы старта и срывы хода — фразами вкладки Analysis.
 */
const ANALYSIS_TEXTS: SectionTexts = {
  name: 'Analysis',
  openTab: 'Open the Analysis tab',
  writeOnTab: 'Write Analysis on the Analysis tab',
  autostart: {
    AUTOSTART_SKIPPED_EXISTING: 'the version already has a finished analysis run',
    AUTOSTART_SKIPPED_IN_PROGRESS: 'the analysis of this version is already being written',
    AUTOSTART_SKIPPED_LLM_DISABLED: 'the language models are switched off on the server',
    AUTOSTART_NOTHING_TO_START: 'the autostart closed without starting the analysis',
    AUTOSTART_FAILED: 'the start of the analysis failed',
    AUTOSTART_CANCELLED: 'the start of the analysis was cancelled',
    DOSSIER_TOO_LONG: stepFailureText('DOSSIER_TOO_LONG'),
  },
  reasonText,
  refusalTextOfCode,
};

/** Причина словами (порядок — `sectionReasonText`). */
export const analysisReasonText = (
  reason: string | null,
  status: 'failed' | 'skipped' = 'skipped'
): string => sectionReasonText(ANALYSIS_TEXTS, reason, status);

const blocks = (n: number): string => `${n} ${n === 1 ? 'block' : 'blocks'}`;

/** Ход анализа без паузы и без конца операции: идёт шаг, следующий за законченными. */
const buildingLine = (a: TranslationRunAnalysis): SectionLine => {
  if (a.stepsTotal === null) return { text: 'Analysis: writing', link: null };
  const current = Math.min(a.stepsDone + 1, a.stepsTotal);
  return { text: `Analysis: writing, step ${current} of ${a.stepsTotal}`, link: null };
};

/** «Done» — ядро собрано и ни одного упавшего блока (решение арбитра `F07 | F07-3b`, В2). */
const readyLine = (a: TranslationRunAnalysis): SectionLine => {
  if (a.failedItems === 0 && a.coreReady) {
    return a.flaggedItems > 0
      ? {
          text: `Analysis: done, blocks with model flags: ${a.flaggedItems}`,
          link: ANALYSIS_TEXTS.openTab,
        }
      : { text: 'Analysis: done', link: null };
  }
  const parts = [
    ...(a.failedItems > 0 ? [`${blocks(a.failedItems)} failed`] : []),
    ...(a.coreReady ? [] : ['core not ready']),
  ];
  return { text: `Analysis: partly done — ${parts.join(', ')}`, link: ANALYSIS_TEXTS.openTab };
};

/**
 * Строка анализа языка по ответу. `null` — строки нет: у запуска нет Write Analysis, либо язык
 * `done`, а анализа нет (черновик удалён).
 */
export const analysisLineOf = (
  writeAnalysis: boolean,
  language: { status: TranslationRunLanguageStatus; analysis: TranslationRunAnalysis | null }
): SectionLine | null =>
  sectionLineOf(ANALYSIS_TEXTS, writeAnalysis, language.status, language.analysis, {
    building: buildingLine,
    ready: readyLine,
  });

/** Траты Analysis по языкам отчёта; анализа нет ни у одного языка — `null`. */
export const sumAnalysisSpent = (
  languages: ReadonlyArray<{ analysis?: Pick<TranslationRunAnalysis, 'spentUsd'> | null }>
): string | null => sumSectionSpent(languages.map((l) => l.analysis));
