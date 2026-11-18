import { translationRunRefetchInterval } from '@/api/hooks';
import {
  addMoney,
  isPositiveMoney,
} from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type {
  TranslationRun,
  TranslationRunReport,
  TranslationRunSummary,
} from '@/types/api-schema';
import { isAnalysisComplete } from './analysisLine.utils';
import { isSummaryComplete } from './summaryLine.utils';

/**
 * Сводка запуска для экрана перевода версии: одним взглядом — закончена ли работа целиком
 * (перевод, досье и глоссарии, Summary и Analysis всех языков) и сколько она стоила. Подробные
 * строки хода — ниже, в деталях (RunProgress, история).
 */

export type RunOutcomeKind = 'running' | 'paused' | 'done' | 'attention' | 'cancelled';

export interface RunOutcome {
  kind: RunOutcomeKind;
  title: string;
  /** Что не доделано, по языкам и разделам; пусто — нечего чинить. */
  problems: string[];
  /** Языков, переведённых до конца (`done`), из всех языков запуска. */
  languagesTranslated: number;
  languagesTotal: number;
  /** Что-то стоит на паузе (строка проблемы) — нужен «Resume» или «Cancel», и при «In progress». */
  hasPause: boolean;
  /** Пометок модели к проверке: куски перевода, тексты Summary, блоки Analysis. */
  modelFlags: number;
}

const OUTCOME_TITLES: Record<RunOutcomeKind, string> = {
  running: 'In progress',
  paused: 'Paused — needs your action',
  done: 'Finished — everything is done',
  attention: 'Finished, but not everything is done',
  cancelled: 'Cancelled',
};

const code = (language: string): string => language.toUpperCase();

/**
 * Раздел языка не доделан: строка проблемы; доделан, выключен или ещё идёт — `null`. Статусы — те
 * же, что разбирает строка раздела в деталях (`sectionLineOf`, `stoppedLine`): всё, что там
 * «paused», «stopped», «failed», «not started», «discarded» или «partly done», здесь — проблема
 * (пауза — сразу, даже пока другие языки ещё переводятся).
 */
const sectionProblem = (
  name: 'summary' | 'analysis',
  enabled: boolean,
  languageDone: boolean,
  section: Pick<TranslationRunSummary, 'status' | 'operationStatus'> | null,
  complete: boolean
): string | null => {
  // Перевод языка не дошёл — раздел и не мог начаться: проблема уже названа у языка.
  if (!enabled || !languageDone) return null;
  // Язык готов, а раздела нет: автозапуск ещё не создал операцию или черновик удалён — в любом
  // случае раздел не написан (без «missing»: это может быть и минута до старта).
  if (section === null) return `${name} not written yet`;
  switch (section.status) {
    case 'ready':
      return complete ? null : `${name} partly done`;
    case 'failed':
      return `${name} failed`;
    case 'skipped':
      return `${name} not started`;
    case 'discarded':
      return `${name} discarded`;
    case 'building':
      // Идёт (`active`, `done` — окно до записи статуса хода) — не проблема; пауза — видна сразу,
      // и пока другие языки переводятся; упала или отменена — встал. Операции нет среди операций
      // запуска (`null`): ход перезапущен с вкладки раздела своей операцией — пишется, но не этим
      // запуском; «stopped» тут было бы ложью.
      switch (section.operationStatus) {
        case 'active':
        case 'done':
          return null;
        case 'paused':
          return `${name} paused`;
        case null:
          return `${name} being written on its tab`;
        default:
          return `${name} stopped`;
      }
    case 'pending':
      return null;
  }
};

const languageProblems = (run: TranslationRun): string[] =>
  run.languages.flatMap((l) => {
    if (l.status === 'failed' || l.status === 'cancelled') {
      return [`${code(l.language)}: translation ${l.status}`];
    }
    const done = l.status === 'done';
    const parts = [
      sectionProblem(
        'summary',
        run.writeSummary,
        done,
        l.summary,
        l.summary !== null && isSummaryComplete(l.summary)
      ),
      sectionProblem(
        'analysis',
        run.writeAnalysis,
        done,
        l.analysis,
        l.analysis !== null && isAnalysisComplete(l.analysis)
      ),
    ].filter((p): p is string => p !== null);
    return parts.length === 0 ? [] : [`${code(l.language)}: ${parts.join(', ')}`];
  });

const PAUSED = 'paused';

/** Пауза — только та, что названа строкой проблемы: исход «Paused» без указания где не бывает. */
const isPaused = (problems: readonly string[]): boolean => problems.some((p) => p.includes(PAUSED));

const outcomeKind = (run: TranslationRun, problems: string[]): RunOutcomeKind => {
  // Идёт сам запуск, его досье или глоссарий, либо Summary/Analysis языка — то же правило, что
  // держит опрос хода.
  if (translationRunRefetchInterval(run) !== false) return 'running';
  if (isPaused(problems)) return 'paused';
  if (run.operation.status === 'cancelled') return 'cancelled';
  return problems.length === 0 && run.operation.status === 'done' ? 'done' : 'attention';
};

export const runOutcome = (run: TranslationRun): RunOutcome => {
  const problems = languageProblems(run);
  if (run.operation.status === 'failed') problems.unshift('the run itself failed');
  // Пауза самого запуска или его досье/глоссария — строкой сразу: пока пишется Summary другого
  // языка, исход «In progress», и без этой строки пауза ждала бы «Resume» молча.
  else if (run.operation.status === 'paused') problems.unshift('translation paused');
  // Досье и глоссарий бывают общими с другим запуском: их пауза — дело этого запуска, только пока
  // он сам не закончен и не отменён.
  const runOpen = run.operation.status === 'active' || run.operation.status === 'paused';
  if (runOpen && run.operations.some((o) => o.status === 'paused'))
    problems.unshift('dossier or glossary paused');
  const kind = outcomeKind(run, problems);
  return {
    kind,
    title: OUTCOME_TITLES[kind],
    problems,
    hasPause: isPaused(problems),
    // «N of M translated» — только переведённые: упавший или отменённый язык не переведён.
    languagesTranslated: run.languages.filter((l) => l.status === 'done').length,
    languagesTotal: run.languages.length,
    modelFlags: run.languages.reduce(
      (sum, l) =>
        sum + l.flaggedChunks + (l.summary?.flaggedTexts ?? 0) + (l.analysis?.flaggedItems ?? 0),
      0
    ),
  };
};

/** Строка разбивки трат: язык или общая статья; `null` у суммы — сумма не по форме денег. */
export interface CostRow {
  label: string;
  translationUsd: string | null;
  summaryUsd: string | null;
  analysisUsd: string | null;
  totalUsd: string | null;
}

const ZERO = '0';

/**
 * Разбивка трат запуска: язык — перевод (с его глоссарием), Summary, Analysis и их сумма; ниже —
 * общее досье и остаток до итога запуска (только если больше нуля; остаток считает бэкенд — строки
 * сходятся с итогом). Итог экрана — `totalUsd` отчёта. Сумма
 * раздела не по форме денег — прочерк и в итоге строки (`addMoney` → `null`), а не ноль.
 * Разбивки в ответе нет (бэкенд старее экрана: фронт выкатывается пушем, бэкенд — тегом) —
 * строк нет, итог и исход экрана остаются.
 */
export const costRows = (report: TranslationRunReport): CostRow[] => {
  // Тип говорит «есть», но старый бэкенд поля не отдаёт: проверка — по ответу, а не по типу.
  const breakdown = (report as Partial<TranslationRunReport>).breakdown;
  if (!breakdown) return [];
  const byLanguage = new Map(report.languages.map((l) => [l.language, l]));
  const rows: CostRow[] = breakdown.languages.map((b) => {
    const l = byLanguage.get(b.language);
    const translationUsd = addMoney(b.translationUsd, b.glossaryUsd);
    const summaryUsd = l?.summary?.spentUsd ?? null;
    const analysisUsd = l?.analysis?.spentUsd ?? null;
    return {
      label: code(b.language),
      translationUsd,
      summaryUsd,
      analysisUsd,
      totalUsd:
        translationUsd === null
          ? null
          : addMoney(translationUsd, summaryUsd ?? ZERO, analysisUsd ?? ZERO),
    };
  });
  // Общие строки (досье, остаток) — не перевод: сумма только в итоге строки.
  const shared = (label: string, usd: string): CostRow => ({
    label,
    translationUsd: null,
    summaryUsd: null,
    analysisUsd: null,
    totalUsd: usd,
  });
  return [
    ...rows,
    ...(isPositiveMoney(breakdown.dossierUsd)
      ? [shared('Dossier (all languages)', breakdown.dossierUsd)]
      : []),
    ...(isPositiveMoney(breakdown.unattributedUsd)
      ? [shared('Other', breakdown.unattributedUsd)]
      : []),
  ];
};
