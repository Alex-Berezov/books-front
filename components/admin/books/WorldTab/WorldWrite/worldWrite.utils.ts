import {
  DRAFT_FAILURES,
  isNothingToAdd,
  isPending,
  sortItems,
  contextEstimateLines,
  failureReason,
  limitLine,
  operationStatusText,
  refusalCode,
  refusalText as draftRefusalText,
  runStartLossText,
} from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { DOSSIER_REFUSED_TEXT } from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  WorldAcceptAllSkipCode,
  WorldAcceptAllSkipped,
  WorldBlockChangedBody,
  WorldWrite,
  WorldWriteBlock,
  WorldWriteDroppedQuote,
  WorldWriteEstimate,
  WorldWriteItem,
  WorldWriteRemark,
  WorldWriteStep,
} from '@/types/api-schema';

/**
 * Внешние блоки (`tech.md` §5, правило 6 канона): «Verify facts» — у записанного всегда, у предложения —
 * с его содержимым и проверенными источниками (`WorldWriteContent`).
 */
const EXTERNAL_BLOCKS: ReadonlySet<WorldWriteBlock> = new Set([
  'critique',
  'prototypes',
  'adaptations',
]);

export const isExternalBlock = (block: WorldWriteBlock): boolean => EXTERNAL_BLOCKS.has(block);

const BLOCK_TITLES: Record<WorldWriteBlock, string> = {
  aliases: 'Name forms',
  short: 'Short description',
  profile: 'Profile',
  appearance: 'Appearance',
  character: 'Character',
  arc: 'Arc',
  scenes: 'Scenes',
  relations: 'Relations',
  quotes: 'Quotes',
  faq: 'FAQ',
  critique: 'Critique',
  prototypes: 'Prototypes',
  adaptations: 'Adaptations',
};

/** Имя героя по ключу из кандидатов хода; кандидатов ещё нет или ключ чужой — сам ключ. */
export const characterName = (run: Pick<WorldWrite, 'candidates'>, key: string): string =>
  run.candidates?.find((c) => c.key === key)?.name ?? key;

export const itemTitle = (run: Pick<WorldWrite, 'candidates'>, item: WorldWriteItem): string =>
  `${characterName(run, item.key)}: ${BLOCK_TITLES[item.block] ?? item.block}`;

// Порядок блоков, «нечего добавить» и «предложение» — общие правила ходов анализа и мира.
export { isNothingToAdd, isPending, sortItems };

/** Формы имени — итог выбора героев, отдельно не перегенерируются (409 `WORLD_ITEM_NOT_REGENERABLE`). */
export const isRegenerable = (item: WorldWriteItem): boolean => item.block !== 'aliases';

/**
 * Замечания блока на вкладке. `EXTERNAL_CHECK` — метка «сверить факты» человеку, а не находка
 * модели: в «Model flags» не входит (как у хода анализа, F07 `product.md` §5).
 */
export const checkOf = (
  item: WorldWriteItem
): Pick<WorldWriteItem, 'verdict' | 'remarks' | 'review'> => ({
  verdict: item.verdict,
  remarks: item.remarks.filter((r: WorldWriteRemark) => r.code !== 'EXTERNAL_CHECK'),
  review: item.review,
});

/** Название шага: «Choice of name forms», «Page: Name», «External blocks: Name». */
export const stepTitle = (run: Pick<WorldWrite, 'candidates'>, step: WorldWriteStep): string => {
  if (step.kind === 'select' || step.key === null) return 'Choice of characters and name forms';
  const name = characterName(run, step.key);
  return step.kind === 'page' ? `Page: ${name}` : `External blocks: ${name}`;
};

/** Ход пишется: какой шаг сейчас; чего ждёт; пауза — причиной. Шаги: 0 — выбор, затем на героя два. */
export const progressText = (run: WorldWrite): string => {
  const done = run.steps.length;
  const total = run.stepsTotal;
  let writing: string;
  if (total === null || done === 0) {
    writing = 'Step 1: choosing the characters and name forms…';
  } else if (done >= total) {
    // Все шаги пройдены, ход дописывает записи: шага сверх счёта не выдумываем.
    writing = `Step ${total} of ${total}: finishing…`;
  } else {
    const kind = (done - 1) % 2 === 0 ? 'Page' : 'External blocks';
    // Кандидата под этим номером нет (ответ хода разошёлся со счётом) — шаг без имени.
    const candidate = run.candidates?.[Math.floor((done - 1) / 2)];
    writing = `Step ${done + 1} of ${total}: ${kind}${candidate ? `: ${candidate.name}` : ''}…`;
  }
  return operationStatusText(run.operation, run.waitingFor, writing);
};

/**
 * Отказы хода (`api/endpoints/admin/world-write.ts`); прочие коды — подписями ходов из досье
 * и запуска перевода (`DOSSIER_STALE`, `LLM_CEILING_REACHED`, `LLM_DISABLED` …).
 */
const REFUSALS: Record<string, string> = {
  DRAFT_IN_PROGRESS: 'The world of this version is already being written.',
  SOURCE_HAS_NO_CHAPTERS: 'This version has no chapter text to write the world from.',
  DOSSIER_TOO_LONG: DOSSIER_REFUSED_TEXT,
  WORLD_ANALYSIS_MISSING:
    'The version has no analysis with a main character: write the analysis first.',
  WORLD_LANGUAGE_UNSUPPORTED: 'Write World takes only ru and en versions for now.',
  WORLD_WRITE_NOT_READY: 'The run is not ready any more: it is being written, failed or discarded.',
  WORLD_REGEN_IN_PROGRESS: 'This block is being regenerated: wait until it finishes.',
  WORLD_ITEM_NOT_PROPOSED: 'This block is no longer a proposal: reload the tab.',
  WORLD_PROPOSAL_CHANGED:
    'The proposal changed since you opened it: read the new text and press Accept again.',
  WORLD_ITEM_UNKNOWN: 'The run has no such block: reload the tab.',
  WORLD_ITEM_NOT_REGENERABLE:
    'Name forms are not regenerated on their own: they come from the choice of characters.',
};

export const refusalText = (error: unknown): string => {
  const code = refusalCode(error);
  if (code === 'WORLD_WRITE_REFUSED') {
    const errors = (error as ApiError).data?.errors;
    const list = Array.isArray(errors) ? errors.map(String).join('; ') : '';
    return list
      ? `The world import refused this block: ${list}.`
      : 'The world import refused this block.';
  }
  // Только свои ключи таблицы: код вида `toString` — не подпись, а чужой отказ.
  return code && Object.hasOwn(REFUSALS, code) ? REFUSALS[code] : draftRefusalText(error);
};

/** Причины хода, шагов и блоков (`failedReason`, `regenFailedReason`): общие с ходами из досье и свои. */
const RUN_FAILURES: Readonly<Record<string, string>> = {
  ...DRAFT_FAILURES,
  WORLD_ANALYSIS_MISSING: 'the version has no analysis with a main character',
  WORLD_CHARACTER_NOT_FOUND: 'the name forms found the character in no chapter',
  WORLD_PAGE_MISSING: 'the page of the character was not written',
  WORLD_WRITE_REFUSED: 'the world import refused the write',
  IMPORT_INVALID: 'the block failed the world checks after the redo',
};

export const reasonText = (reason: string | null): string => failureReason(reason, RUN_FAILURES);

/**
 * Окно подтверждения старта: что строится первым, сколько героев и сколько стоит сверху. Герои - верхняя
 * граница: главные и второстепенные до порога глав (решение арбитра `F08 | F08-8b` Q1).
 */
export const writeEstimateText = (estimate: WorldWriteEstimate): string => {
  const upper = estimate.upperBound ? ' (the dossier or the glossary is not built yet)' : '';
  return [
    ...contextEstimateLines(estimate),
    `The world: at most ${estimate.candidates} ${estimate.candidates === 1 ? 'character' : 'characters'} (main and secondary), up to ${formatMoney(estimate.stageUsd)}${upper}.`,
    limitLine(estimate.suggestedLimitUsd),
  ].join(' ');
};

/** Что теряет новый старт поверх готового хода: непринятые предложения и идущие перегенерации. */
export const startLossText = (run: WorldWrite | null): string => runStartLossText(run, isPending);

/** Тело 409 `WORLD_BLOCK_CHANGED`; другой отказ — `null`. */
export const blockChangedOf = (error: unknown): WorldBlockChangedBody | null =>
  error instanceof ApiError && refusalCode(error) === 'WORLD_BLOCK_CHANGED' && error.data
    ? (error.data as unknown as WorldBlockChangedBody)
    : null;

/** Почему «Accept all» оставил пункт предложением. */
const SKIP_TEXT: Record<WorldAcceptAllSkipCode, string> = {
  WORLD_BLOCK_CHANGED: 'the editor changed the block',
  WORLD_WRITE_REFUSED: 'the world import refused the write',
  WORLD_REGEN_IN_PROGRESS: 'the block is being regenerated',
};

const SKIP_HINT: Record<WorldAcceptAllSkipCode, string> = {
  WORLD_BLOCK_CHANGED: ': press Accept to see what the block holds now, or Discard',
  WORLD_WRITE_REFUSED: ': press Accept on the block to retry, it says why if refused, or Discard',
  WORLD_REGEN_IN_PROGRESS: '',
};

/** Строка пропущенного пункта; `actionable: false` — ход не готов, кнопок у пунктов нет. */
export const skippedText = (
  run: Pick<WorldWrite, 'candidates'>,
  skipped: WorldAcceptAllSkipped,
  item: WorldWriteItem | undefined,
  actionable = true
): string =>
  `${item ? itemTitle(run, item) : `Block ${skipped.index}`}: ${SKIP_TEXT[skipped.code] ?? skipped.code}${actionable ? (SKIP_HINT[skipped.code] ?? '') : ''}.`;

const QUOTE_REASON: Record<WorldWriteDroppedQuote['reason'], string> = {
  QUOTE_NOT_VERBATIM: 'not word for word in the chapter',
  CHAPTER_UNKNOWN: 'the version has no such chapter',
};

export const droppedQuoteText = (q: WorldWriteDroppedQuote): string =>
  `«${q.text}»${q.chapter !== null ? ` (chapter ${q.chapter})` : ''} — ${QUOTE_REASON[q.reason] ?? q.reason}`;
