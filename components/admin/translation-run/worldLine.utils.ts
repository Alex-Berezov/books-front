import {
  reasonText,
  refusalTextOfCode,
} from '@/components/admin/books/WorldTab/WorldWrite/worldWrite.utils';
import type {
  TranslationRunAnalysis,
  TranslationRunLanguageStatus,
  TranslationRunWorld,
} from '@/types/api-schema';
import {
  type SectionLine,
  type SectionTexts,
  sectionLineOf,
  sectionReasonText,
  sumSectionSpent,
} from './sectionLine.utils';
import { stepFailureText } from './translationRun.utils';

/**
 * Подписи мира языка запуска (F08-9b, по образцу строки Analysis F07-3b): коды автозапуска — своей
 * таблицей, отказы старта и срывы хода — фразами вкладки World. Ожидание анализа строка отдаёт как
 * `pending` без причины (`WAITS_FOR_ANALYSIS` живёт только в `lastError` задачи) — его подпись
 * берётся по строке Analysis того же языка (решение арбитра `F08 | F08-9b-2`).
 */
const WORLD_TEXTS: SectionTexts = {
  name: 'World',
  openTab: 'Open the World tab',
  writeOnTab: 'Write World on the World tab',
  autostart: {
    AUTOSTART_SKIPPED_EXISTING: 'the version already has a finished world run',
    AUTOSTART_SKIPPED_IN_PROGRESS: 'the world of this version is already being written',
    AUTOSTART_SKIPPED_LLM_DISABLED: 'the language models are switched off on the server',
    AUTOSTART_NOTHING_TO_START: 'the autostart closed without starting the world',
    AUTOSTART_FAILED: 'the start of the world failed',
    AUTOSTART_CANCELLED: 'the start of the world was cancelled',
    WORLD_ANALYSIS_MISSING: 'the analysis of this language is not ready',
    DOSSIER_TOO_LONG: stepFailureText('DOSSIER_TOO_LONG'),
  },
  reasonText,
  refusalTextOfCode,
};

/** Причина словами (порядок — `sectionReasonText`). */
export const worldReasonText = (
  reason: string | null,
  status: 'failed' | 'skipped' = 'skipped'
): string => sectionReasonText(WORLD_TEXTS, reason, status);

const blocks = (n: number): string => `${n} ${n === 1 ? 'block' : 'blocks'}`;

/** Ход мира без паузы и без конца операции: идёт шаг, следующий за законченными. */
const buildingLine = (w: TranslationRunWorld): SectionLine => {
  if (w.stepsTotal === null) return { text: 'World: writing', link: null };
  const current = Math.min(w.stepsDone + 1, w.stepsTotal);
  return { text: `World: writing, step ${current} of ${w.stepsTotal}`, link: null };
};

/** «Done» — ни одного упавшего блока. */
export const isWorldComplete = (w: Pick<TranslationRunWorld, 'failedItems'>): boolean =>
  w.failedItems === 0;

const readyLine = (w: TranslationRunWorld): SectionLine => {
  if (!isWorldComplete(w)) {
    return {
      text: `World: partly done — ${blocks(w.failedItems)} failed`,
      link: WORLD_TEXTS.openTab,
    };
  }
  return w.flaggedItems > 0
    ? { text: `World: done, blocks with model flags: ${w.flaggedItems}`, link: WORLD_TEXTS.openTab }
    : { text: 'World: done', link: null };
};

/**
 * Строка мира языка по ответу. `null` — строки нет: у запуска нет Write World, либо язык `done`,
 * а мира нет (черновик удалён). `pending`, пока анализ языка не появился, ждёт старта, пишется или
 * ведётся на вкладке Analysis (`skipped`, `discarded`), — ждёт анализа (идёт он или встал — видно
 * строкой Analysis выше); при готовом или упавшем анализе — ждёт старта.
 */
export const worldLineOf = (
  writeWorld: boolean,
  language: {
    status: TranslationRunLanguageStatus;
    world: TranslationRunWorld | null;
    analysis: Pick<TranslationRunAnalysis, 'status'> | null;
  }
): SectionLine | null => {
  const analysisStatus = language.analysis?.status;
  if (
    writeWorld &&
    language.world?.status === 'pending' &&
    analysisStatus !== 'ready' &&
    analysisStatus !== 'failed'
  ) {
    return { text: 'World: waiting for the analysis', link: null };
  }
  return sectionLineOf(WORLD_TEXTS, writeWorld, language.status, language.world, {
    building: buildingLine,
    ready: readyLine,
  });
};

/** Траты World по языкам отчёта; мира нет ни у одного языка — `null`. */
export const sumWorldSpent = (
  languages: ReadonlyArray<{ world?: Pick<TranslationRunWorld, 'spentUsd'> | null }>
): string | null => sumSectionSpent(languages.map((l) => l.world));
