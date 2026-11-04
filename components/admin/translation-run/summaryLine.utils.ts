import {
  reasonText,
  refusalTextOfCode,
} from '@/components/admin/books/SummaryTab/SummaryWrite/summaryWrite.utils';
import { addMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type { TranslationRunLanguageStatus, TranslationRunSummary } from '@/types/api-schema';
import { operationPauseText, stepFailureText } from './translationRun.utils';

/**
 * Подписи раздела языка запуска (F06-5b, `product.md` §5): коды автозапуска — своей таблицей,
 * отказы старта и срывы хода — фразами вкладки Summary, одними на всю админку.
 */
const AUTOSTART: Record<string, string> = {
  AUTOSTART_SKIPPED_EXISTING: 'the version already has a finished summary run',
  AUTOSTART_SKIPPED_IN_PROGRESS: 'the summary of this version is already being written',
  AUTOSTART_SKIPPED_LLM_DISABLED: 'the language models are switched off on the server',
  AUTOSTART_NOTHING_TO_START: 'the autostart closed without starting the summary',
  AUTOSTART_FAILED: 'the start of the summary failed',
  AUTOSTART_CANCELLED: 'the start of the summary was cancelled',
  // На вкладке у этого кода абзац с кодом в скобках — в строку идёт фраза этапа запуска,
  // та же, что у языка перевода (`STEP_FAILURES`): одна фраза на два места.
  DOSSIER_TOO_LONG: stepFailureText('DOSSIER_TOO_LONG'),
};

/** Фраза вкладки — в середину строки: без конечной точки и с маленькой буквы. */
export const inlinePhrase = (text: string): string =>
  // Заглавная — только первая буква слова, не аббревиатура («LLM»): «A model» → «a model».
  text.replace(/\.$/, '').replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());

/** Отказ старта словами вкладки; незнакомый код — причиной хода или как есть. */
const refusalReason = (reason: string): string => {
  const refusal = refusalTextOfCode(reason);
  return refusal ? inlinePhrase(refusal) : reasonText(reason);
};

/**
 * Причина словами: фраза автозапуска; у `failed` — сначала срыв хода, у `skipped` — сначала
 * отказ старта (тот же код в двух таблицах подписан по-разному). Незнакомый код — как есть.
 */
export const summaryReasonText = (
  reason: string | null,
  status: 'failed' | 'skipped' = 'skipped'
): string => {
  if (reason === null) return reasonText(null);
  if (AUTOSTART[reason]) return AUTOSTART[reason];
  if (status === 'skipped') return refusalReason(reason);
  const failure = reasonText(reason);
  return failure !== reason ? failure : refusalReason(reason);
};

const texts = (n: number): string => `${n} ${n === 1 ? 'text' : 'texts'}`;

/** Ссылка на вкладку Summary версии языка. */
const OPEN_TAB = 'Open the Summary tab';
/** Подсказка «не начат» (Р7) — она же ссылка на вкладку. */
const WRITE_ON_TAB = 'Write Summary on the Summary tab';

/** Строка раздела языка; `link` — текст ссылки на вкладку Summary версии языка, `null` — без ссылки. */
export interface SummaryLine {
  text: string;
  link: string | null;
}

/** Ход раздела без паузы и без конца операции. */
const buildingLine = (s: TranslationRunSummary): SummaryLine => {
  if (s.operationStatus === 'paused') {
    return { text: `Summary: paused — ${operationPauseText(s.pauseReason)}`, link: OPEN_TAB };
  }
  if (s.operationStatus === 'failed' || s.operationStatus === 'cancelled') {
    return {
      text: `Summary: stopped — its operation ${s.operationStatus === 'failed' ? 'failed' : 'was cancelled'}`,
      link: OPEN_TAB,
    };
  }
  const planned = s.plannedSections === null ? '' : ` of ${s.plannedSections}`;
  return { text: `Summary: writing, sections ${s.sectionsDone}${planned}`, link: null };
};

const readyLine = (s: TranslationRunSummary): SummaryLine => {
  const missing = [
    ...(s.fullDone ? [] : ['no full summary']),
    ...(s.briefDone ? [] : ['no very short']),
  ];
  if (s.failedTexts === 0 && missing.length === 0) {
    return s.flaggedTexts > 0
      ? { text: `Summary: done, texts with model flags: ${s.flaggedTexts}`, link: OPEN_TAB }
      : { text: 'Summary: done', link: null };
  }
  const parts = [...(s.failedTexts > 0 ? [`${texts(s.failedTexts)} failed`] : []), ...missing];
  return { text: `Summary: partly done — ${parts.join(', ')}`, link: OPEN_TAB };
};

/**
 * Строка раздела языка по ответу. `null` — строки нет: у запуска нет Write Summary, либо язык
 * `done`, а раздела нет (черновик удалён).
 */
export const summaryLineOf = (
  writeSummary: boolean,
  language: { status: TranslationRunLanguageStatus; summary: TranslationRunSummary | null }
): SummaryLine | null => {
  if (!writeSummary) return null;
  const s = language.summary;
  if (!s) {
    if (language.status === 'done') return null;
    if (language.status === 'failed' || language.status === 'cancelled') {
      return { text: `Summary: not started — translation ${language.status}`, link: null };
    }
    return { text: 'Summary: waiting for translation', link: null };
  }
  switch (s.status) {
    case 'pending':
      return { text: 'Summary: waiting to start', link: null };
    case 'building':
      return buildingLine(s);
    case 'ready':
      return readyLine(s);
    case 'failed':
      return { text: `Summary: failed — ${summaryReasonText(s.reason, 'failed')}`, link: OPEN_TAB };
    case 'skipped':
      return { text: `Summary: not started — ${summaryReasonText(s.reason)}`, link: WRITE_ON_TAB };
    case 'discarded':
      return { text: 'Summary: discarded on the Summary tab', link: null };
  }
};

/** Траты Summary по языкам отчёта; раздела нет ни у одного языка или сумма не по форме денег — `null`. */
export const sumSummarySpent = (
  languages: ReadonlyArray<{ summary: Pick<TranslationRunSummary, 'spentUsd'> | null }>
): string | null => {
  const spent = languages.flatMap((l) => (l.summary ? [l.summary.spentUsd] : []));
  return spent.length === 0 ? null : addMoney(...spent);
};
