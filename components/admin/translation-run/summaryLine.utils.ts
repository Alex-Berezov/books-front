import {
  reasonText,
  refusalTextOfCode,
} from '@/components/admin/books/SummaryTab/SummaryWrite/summaryWrite.utils';
import type { TranslationRunLanguageStatus, TranslationRunSummary } from '@/types/api-schema';
import {
  type SectionLine,
  type SectionTexts,
  sectionLineOf,
  sectionReasonText,
  sumSectionSpent,
} from './sectionLine.utils';
import { stepFailureText } from './translationRun.utils';

/**
 * Подписи раздела языка запуска (F06-5b, `product.md` §5): коды автозапуска — своей таблицей,
 * отказы старта и срывы хода — фразами вкладки Summary, одними на всю админку.
 */
const SUMMARY_TEXTS: SectionTexts = {
  name: 'Summary',
  openTab: 'Open the Summary tab',
  // Подсказка «не начат» (Р7) — она же ссылка на вкладку.
  writeOnTab: 'Write Summary on the Summary tab',
  autostart: {
    AUTOSTART_SKIPPED_EXISTING: 'the version already has a finished summary run',
    AUTOSTART_SKIPPED_IN_PROGRESS: 'the summary of this version is already being written',
    AUTOSTART_SKIPPED_LLM_DISABLED: 'the language models are switched off on the server',
    AUTOSTART_NOTHING_TO_START: 'the autostart closed without starting the summary',
    AUTOSTART_FAILED: 'the start of the summary failed',
    AUTOSTART_CANCELLED: 'the start of the summary was cancelled',
    // На вкладке у этого кода абзац с кодом в скобках — в строку идёт фраза этапа запуска,
    // та же, что у языка перевода (`STEP_FAILURES`): одна фраза на два места.
    DOSSIER_TOO_LONG: stepFailureText('DOSSIER_TOO_LONG'),
  },
  reasonText,
  refusalTextOfCode,
};

/** Причина словами (порядок — `sectionReasonText`). */
export const summaryReasonText = (
  reason: string | null,
  status: 'failed' | 'skipped' = 'skipped'
): string => sectionReasonText(SUMMARY_TEXTS, reason, status);

const texts = (n: number): string => `${n} ${n === 1 ? 'text' : 'texts'}`;

/** Ход раздела без паузы и без конца операции. */
const buildingLine = (s: TranslationRunSummary): SectionLine => {
  const planned = s.plannedSections === null ? '' : ` of ${s.plannedSections}`;
  return { text: `Summary: writing, sections ${s.sectionsDone}${planned}`, link: null };
};

const readyLine = (s: TranslationRunSummary): SectionLine => {
  const missing = [
    ...(s.fullDone ? [] : ['no full summary']),
    ...(s.briefDone ? [] : ['no very short']),
  ];
  if (s.failedTexts === 0 && missing.length === 0) {
    return s.flaggedTexts > 0
      ? {
          text: `Summary: done, texts with model flags: ${s.flaggedTexts}`,
          link: SUMMARY_TEXTS.openTab,
        }
      : { text: 'Summary: done', link: null };
  }
  const parts = [...(s.failedTexts > 0 ? [`${texts(s.failedTexts)} failed`] : []), ...missing];
  return { text: `Summary: partly done — ${parts.join(', ')}`, link: SUMMARY_TEXTS.openTab };
};

/**
 * Строка раздела языка по ответу. `null` — строки нет: у запуска нет Write Summary, либо язык
 * `done`, а раздела нет (черновик удалён).
 */
export const summaryLineOf = (
  writeSummary: boolean,
  language: { status: TranslationRunLanguageStatus; summary: TranslationRunSummary | null }
): SectionLine | null =>
  sectionLineOf(SUMMARY_TEXTS, writeSummary, language.status, language.summary, {
    building: buildingLine,
    ready: readyLine,
  });

/** Траты Summary по языкам отчёта; раздела нет ни у одного языка или сумма не по форме денег — `null`. */
export const sumSummarySpent = (
  languages: ReadonlyArray<{ summary: Pick<TranslationRunSummary, 'spentUsd'> | null }>
): string | null => sumSectionSpent(languages.map((l) => l.summary));
