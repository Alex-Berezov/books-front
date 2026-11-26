import {
  DRAFT_FAILURES,
  isNothingToAdd,
  isPending,
  sortItems,
  contextEstimateLines,
  failureReason,
  limitLine,
  operationStatusText,
  pluralWord,
  refusalCode,
  refusalText as draftRefusalText,
  refusalTextOfCode as draftRefusalTextOfCode,
  runStartLossText,
} from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { formatMoney } from '@/components/admin/llm-settings/LlmSettings/llmSettings.utils';
import { DOSSIER_REFUSED_TEXT } from '@/components/admin/translation-run/translationRun.utils';
import { pairDisplayName, pairNames } from '@/lib/book-world/pair';
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
  WorldWriteLeftOut,
  WorldWritePair,
  WorldWritePairsOff,
  WorldWritePlace,
  WorldWritePlaceValue,
  WorldWritePlacesOff,
  WorldWriteRemark,
  WorldWriteSkipReason,
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
  compare: 'Comparison',
  bonds: 'What links them',
  differences: 'What sets them apart',
  conclusion: 'Conclusion',
  imageBrief: 'Illustration brief',
  kind: 'Real or fictional, Wikidata ID',
  location: 'Location',
  significance: 'Significance',
  description: 'Description',
};

/**
 * Предложение пункта `kind` места (F08-12b, решение `F08 | F08-12b` R3) строкой: «real, Wikidata Q656»,
 * «real, no Wikidata ID», «fictional». Вида нет — `null`: предложение очищает блок.
 */
export const placeValueText = (place: WorldWritePlaceValue | null | undefined): string | null => {
  if (!place?.kind) return null;
  if (place.kind === 'fictional') return 'fictional';
  return place.wikidataId ? `real, Wikidata ${place.wikidataId}` : 'real, no Wikidata ID';
};

/** Имя героя по ключу из кандидатов хода; кандидатов ещё нет или ключ чужой — сам ключ. */
export const characterName = (run: Pick<WorldWrite, 'candidates'>, key: string): string =>
  run.candidates?.find((c) => c.key === key)?.name ?? key;

/** Что нужно для имён хода: кандидаты-герои, пары (имя пары — по её героям) и места (`F08-12b`). */
export type RunNames = Pick<WorldWrite, 'candidates'> &
  Partial<Pick<WorldWrite, 'pairs' | 'places'>>;

/** Имя пары в подписях админки: «{Имя} and {Имя}». */
const PAIR_NAME_TEMPLATE = '{a} and {b}';

/**
 * Имя пары по ключу `{a}--{b}` (общий разбор ключа сайта, `lib/book-world/pair.ts`): «Имя and Имя»
 * по кандидатам хода; ключ не разбирается или героя нет среди кандидатов — сам ключ.
 */
const pairName = (run: RunNames, key: string): string =>
  pairDisplayName(
    PAIR_NAME_TEMPLATE,
    key,
    (k) => run.candidates?.find((c) => c.key === k)?.name,
    key
  );

/**
 * Имя сущности хода: пара хода (по `pairs`, а не по виду ключа: заведённый герой с `--` остался,
 * `LEGACY-507`) — имя пары, иначе имя героя или сам ключ.
 */
export const entityName = (run: RunNames, key: string): string => {
  if (run.pairs?.some((p) => p.key === key)) return pairName(run, key);
  // Место хода (`F08-12b`): по `places`, имя — из выбора.
  const place = run.places?.find((p) => p.key === key);
  return place ? place.name : characterName(run, key);
};

export const itemTitle = (run: RunNames, item: WorldWriteItem): string =>
  `${entityName(run, item.key)}: ${BLOCK_TITLES[item.block] ?? item.block}`;

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

const STEP_KIND_TITLES: Record<Exclude<WorldWriteStep['kind'], 'select'>, string> = {
  page: 'Page',
  external: 'External blocks',
  pair: 'Pair',
  place: 'Place',
};

/** Название шага: «Choice of name forms», «Page: Name», «External blocks: Name», «Pair: A and B». */
export const stepTitle = (run: RunNames, step: WorldWriteStep): string => {
  if (step.kind === 'select') return 'Choice of characters and name forms';
  const kind = STEP_KIND_TITLES[step.kind] ?? step.kind;
  // Шаг пары, не нашедший пару под своим номером, бэкенд пишет с `key: null` (`DRAFT_DATA_INVALID`).
  return step.key === null ? kind : `${kind}: ${entityName(run, step.key)}`;
};

/**
 * Что пишет шаг с номером `step` (с 0): после шагов героев (`2 · героев`) идут шаги пар, по одному
 * на пару (`F08-8e`, `stepAt` бэкенда), после них — шаги мест, по одному на место (`F08-12b`):
 * нечётный шаг героя — страница, чётный — внешние блоки. Пары, места или героя под этим номером
 * нет (ответ разошёлся со счётом) — тот же вид шага без имени.
 * Копия нумерации stepAt из books/src/modules/translation/world-write/world-write.data.ts; менять вместе.
 */
const stepAhead = (
  run: WorldWrite,
  step: number
): { title: string; name?: string; pairNo?: number; placeNo?: number } => {
  const heroSteps = (run.candidates?.length ?? 0) * 2;
  const pairSteps = run.pairs?.length ?? 0;
  const pairIndex = step - 1 - heroSteps;
  if (step > heroSteps + pairSteps) {
    const placeIndex = pairIndex - pairSteps;
    const place = run.places?.[placeIndex];
    return place
      ? { title: 'Place', name: place.name, placeNo: placeIndex + 1 }
      : { title: 'Place' };
  }
  if (step > heroSteps) {
    const pair = run.pairs?.[pairIndex];
    return pair
      ? { title: 'Pair', name: entityName(run, pair.key), pairNo: pairIndex + 1 }
      : { title: 'Pair' };
  }
  const candidate = run.candidates?.[Math.floor((step - 1) / 2)];
  return { title: (step - 1) % 2 === 0 ? 'Page' : 'External blocks', name: candidate?.name };
};

/** Ход пишется: какой шаг сейчас; чего ждёт; пауза — причиной. Шаги: 0 — выбор, затем на героя два, затем по одному на пару. */
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
    // Кандидата или пары под этим номером нет (ответ хода разошёлся со счётом) — шаг без имени.
    const next = stepAhead(run, done);
    const pairs = run.pairs?.length ?? 0;
    const places = run.places?.length ?? 0;
    const count =
      next.pairNo !== undefined
        ? ` (pair ${next.pairNo} of ${pairs})`
        : next.placeNo !== undefined
          ? ` (place ${next.placeNo} of ${places})`
          : '';
    writing = `Step ${done + 1} of ${total}: ${next.title}${next.name ? `: ${next.name}` : ''}${count}…`;
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
  WORLD_LANGUAGE_UNSUPPORTED: 'Write World does not take versions in this language.',
  WORLD_WRITE_NOT_READY: 'The run is not ready any more: it is being written, failed or discarded.',
  WORLD_REGEN_IN_PROGRESS: 'This block is being regenerated: wait until it finishes.',
  WORLD_ITEM_NOT_PROPOSED: 'This block is no longer a proposal: reload the tab.',
  WORLD_PROPOSAL_CHANGED:
    'The proposal changed since you opened it: read the new text and press Accept again.',
  WORLD_ITEM_UNKNOWN: 'The run has no such block: reload the tab.',
  WORLD_ITEM_NOT_REGENERABLE:
    'Name forms are not regenerated on their own: they come from the choice of characters.',
};

/** Подпись отказа хода по коду: своя, затем ходов из досье и запуска; чужой код — `undefined`. */
export const refusalTextOfCode = (code: string): string | undefined =>
  Object.hasOwn(REFUSALS, code) ? REFUSALS[code] : draftRefusalTextOfCode(code);

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
  WORLD_PAIR_MEMBER_MISSING: 'a character of the pair is not in the world of this version',
  WORLD_PAIR_KEY_TAKEN: 'the key of the pair is taken by an entity of another type',
  WORLD_PAIR_NOT_FOUNDED:
    'the pair is not linked in the analysis and its counted shared chapters are too few',
  WORLD_MENTIONS_MOVED: 'the chapter text moved while the presence was recounted',
  WORLD_PLACE_NOT_FOUND: 'the name forms found the place in no chapter',
  WORLD_PLACE_KEY_TAKEN: 'the key of the place is taken by an entity of another type',
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
  const pairsPart =
    estimate.pairs > 0 ? `, at most ${pluralWord(estimate.pairs, 'character pair')}` : '';
  // Места (`F08-12b`): тег бэкенда уезжает первым, ответ без поля фронт не получает.
  const placesPart = estimate.places > 0 ? `, at most ${pluralWord(estimate.places, 'place')}` : '';
  return [
    ...contextEstimateLines(estimate),
    `The world: at most ${estimate.candidates} ${estimate.candidates === 1 ? 'character' : 'characters'} (main and secondary)${pairsPart}${placesPart}, up to ${formatMoney(estimate.stageUsd)}${upper}.`,
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
  run: RunNames,
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

const SKIP_REASON_TEXT: Record<WorldWriteSkipReason, string> = {
  BELOW_MIN_CHAPTERS: 'a secondary character in fewer chapters than the threshold',
  KEY_PAIR_FORM: 'the character key holds "--", reserved for pairs: the character is not written',
  PAIR_KEY_INVALID: 'no valid pair key for these two characters (too long, or "-" at the joint)',
  PAIR_KEY_TAKEN: 'the pair key is taken by an entity of another type',
  PAIRS_MAX: 'over the limit of pairs per run',
  PLACE_BELOW_MIN_CHAPTERS: 'a place in fewer than 2 chapters',
  PLACE_KEY_TAKEN: 'the key of the place is taken by an entity of another type',
  PLACES_MAX: 'over the limit of places per run',
};

/** Причины отсева пары: ключ такой записи — ключ пары (`PAIR_KEY_INVALID` — как вышел бы), а не героя. */
const PAIR_SKIPS: ReadonlySet<WorldWriteSkipReason> = new Set([
  'PAIR_KEY_INVALID',
  'PAIR_KEY_TAKEN',
  'PAIRS_MAX',
]);

/**
 * Герой или пара, которых шаг выбора оставил за ходом: имя, причина, главы. Имя — из `names` записи
 * (героя нет среди кандидатов, ключ пары `PAIR_KEY_INVALID` не разобрать); записи без имён — по ключу.
 */
export const leftOutText = (run: RunNames, skip: WorldWriteLeftOut): string => {
  const isPair = PAIR_SKIPS.has(skip.reason);
  // `?? []`: ответ бэкенда до тега с полем (окно выката) и ход, записанный до поля.
  const [first, second] = skip.names ?? [];
  const name = isPair
    ? pairNames(PAIR_NAME_TEMPLATE, [first, second], pairName(run, skip.key))
    : first || characterName(run, skip.key);
  const chapterWord = isPair ? 'common chapter' : 'chapter';
  const chapters = skip.chapters === null ? '' : ` (${pluralWord(skip.chapters, chapterWord)})`;
  return `${name}${chapters}: ${SKIP_REASON_TEXT[skip.reason] ?? skip.reason}.`;
};

/**
 * Нет части ядра страницы на момент шага: блок и что дописать; страница записана как есть. Снимок шага:
 * перегенерация или правка руками его не меняют - поэтому так и сказано.
 */
export const coreMissingText = (remark: WorldWriteRemark): string =>
  `The step left the core without ${Object.hasOwn(BLOCK_TITLES, remark.where) ? BLOCK_TITLES[remark.where as WorldWriteBlock] : remark.where}: ${remark.note}`;

const PLACES_OFF_TEXT: Record<WorldWritePlacesOff, string> = {
  WORLD_PLACE_LANGUAGE: 'No places in this run: the language has no place sample yet.',
};

/** Ход не пишет мест: причина словами; `null` — места есть или выбор не прошёл (`F08-12b`). */
export const placesOffText = (run: Partial<Pick<WorldWrite, 'placesOff'>>): string | null =>
  run.placesOff == null ? null : (PLACES_OFF_TEXT[run.placesOff] ?? run.placesOff);

/** Место в списке мест хода: имя и главы (`F08-12b`). */
export const placeLine = (place: WorldWritePlace): string =>
  `${place.name} (${pluralWord(place.chapters.length, 'chapter')})`;

const PAIRS_OFF_TEXT: Record<WorldWritePairsOff, string> = {
  WORLD_PAIR_LANGUAGE: 'No pairs in this run: the language has no pair sample yet.',
};

/** Ход не пишет пар: причина словами; `null` — пары есть или выбор не прошёл. */
export const pairsOffText = (run: Pick<WorldWrite, 'pairsOff'>): string | null =>
  run.pairsOff == null ? null : (PAIRS_OFF_TEXT[run.pairsOff] ?? run.pairsOff);

/** Пара в списке пар хода: имя, общие главы, связь в анализе. */
export const pairLine = (run: RunNames, pair: WorldWritePair): string =>
  `${entityName(run, pair.key)} (${pluralWord(pair.chapters.length, 'common chapter')}${pair.linked ? ', linked in the analysis' : ''})`;
