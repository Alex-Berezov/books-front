import { addMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import type {
  LlmOperation,
  TranslationRunLanguageStatus,
  TranslationRunSummaryStatus,
} from '@/types/api-schema';
import { operationPauseText } from './translationRun.utils';

/**
 * Общая часть строк разделов языка запуска — Summary (F06-5b) и Analysis (F07-3b): порядок разбора
 * причины, пауза и остановка хода, «не начат» и «ждёт», ссылка на вкладку. Свои у раздела — только
 * таблица кодов автозапуска, фразы вкладки, ход и «готов».
 */

/** Строка раздела языка; `link` — текст ссылки на вкладку раздела версии языка, `null` — без ссылки. */
export interface SectionLine {
  text: string;
  link: string | null;
}

/** Траты раздела по языкам отчёта; раздела нет ни у одного языка или сумма не по форме денег — `null`. */
export const sumSectionSpent = (
  sections: ReadonlyArray<{ spentUsd: string } | null | undefined>
): string | null => {
  const spent = sections.flatMap((s) => (s ? [s.spentUsd] : []));
  return spent.length === 0 ? null : addMoney(...spent);
};

/** Фраза вкладки — в середину строки: без конечной точки и с маленькой буквы. */
export const inlinePhrase = (text: string): string =>
  // Заглавная — только первая буква слова, не аббревиатура («LLM»): «A model» → «a model».
  text.replace(/\.$/, '').replace(/^[A-Z](?![A-Z])/, (c) => c.toLowerCase());

/** Подписи раздела: имя в строке, ссылки на вкладку, коды автозапуска и фразы вкладки. */
export interface SectionTexts {
  name: 'Summary' | 'Analysis';
  openTab: string;
  writeOnTab: string;
  autostart: Readonly<Record<string, string>>;
  /** Срыв хода словами вкладки (`failedReason`); незнакомый код — как есть. */
  reasonText: (reason: string | null) => string;
  /** Отказ старта словами вкладки; чужой код — `undefined`. */
  refusalTextOfCode: (code: string) => string | undefined;
}

/**
 * Причина словами: фраза автозапуска; у `failed` — сначала срыв хода, у `skipped` — сначала отказ
 * старта (тот же код в двух таблицах подписан по-разному). Незнакомый код — как есть.
 */
export const sectionReasonText = (
  t: SectionTexts,
  reason: string | null,
  status: 'failed' | 'skipped' = 'skipped'
): string => {
  if (reason === null) return t.reasonText(null);
  if (t.autostart[reason]) return t.autostart[reason];
  const refusal = (): string => {
    const text = t.refusalTextOfCode(reason);
    return text ? inlinePhrase(text) : t.reasonText(reason);
  };
  if (status === 'skipped') return refusal();
  const failure = t.reasonText(reason);
  return failure !== reason ? failure : refusal();
};

/**
 * Пропуск, при котором ручной старт не поможет: ход уже пишется (кнопка неактивна) или готов (старт
 * отбросил бы его непринятые предложения) — ссылка ведёт на вкладку, а не советует писать заново.
 */
const OPEN_TAB_SKIPS = new Set(['AUTOSTART_SKIPPED_EXISTING', 'AUTOSTART_SKIPPED_IN_PROGRESS']);

interface SectionState {
  status: TranslationRunSummaryStatus;
  reason: string | null;
  operationStatus: LlmOperation['status'] | null;
  pauseReason: LlmOperation['pauseReason'];
}

/** Пауза или остановка операции хода — со ссылкой; ход идёт — `null`. */
export const stoppedLine = (t: SectionTexts, s: SectionState): SectionLine | null => {
  if (s.operationStatus === 'paused') {
    return { text: `${t.name}: paused — ${operationPauseText(s.pauseReason)}`, link: t.openTab };
  }
  if (s.operationStatus === 'failed' || s.operationStatus === 'cancelled') {
    return {
      text: `${t.name}: stopped — its operation ${s.operationStatus === 'failed' ? 'failed' : 'was cancelled'}`,
      link: t.openTab,
    };
  }
  return null;
};

/**
 * Строка раздела языка по ответу. `null` — строки нет: раздел у запуска выключен, либо язык `done`,
 * а раздела нет (черновик удалён). Ход и «готов» — свои у раздела.
 */
export const sectionLineOf = <S extends SectionState>(
  t: SectionTexts,
  enabled: boolean,
  languageStatus: TranslationRunLanguageStatus,
  s: S | null,
  lines: { building: (s: S) => SectionLine; ready: (s: S) => SectionLine }
): SectionLine | null => {
  if (!enabled) return null;
  if (!s) {
    if (languageStatus === 'done') return null;
    if (languageStatus === 'failed' || languageStatus === 'cancelled') {
      return { text: `${t.name}: not started — translation ${languageStatus}`, link: null };
    }
    return { text: `${t.name}: waiting for translation`, link: null };
  }
  switch (s.status) {
    case 'pending':
      return { text: `${t.name}: waiting to start`, link: null };
    case 'building':
      return stoppedLine(t, s) ?? lines.building(s);
    case 'ready':
      return lines.ready(s);
    case 'failed':
      return {
        text: `${t.name}: failed — ${sectionReasonText(t, s.reason, 'failed')}`,
        link: t.openTab,
      };
    case 'skipped':
      return {
        text: `${t.name}: not started — ${sectionReasonText(t, s.reason)}`,
        link: s.reason !== null && OPEN_TAB_SKIPS.has(s.reason) ? t.openTab : t.writeOnTab,
      };
    case 'discarded':
      return { text: `${t.name}: discarded on the ${t.name} tab`, link: null };
  }
};
