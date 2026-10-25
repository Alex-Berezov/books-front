import { describe, expect, it } from 'vitest';
import {
  chapterOptionsOf,
  chapterRetrying,
  chunkRefusalText,
  editedText,
  editRequest,
  isRetryLimitOk,
  retryFailedText,
  retryRequest,
  retryStateOf,
  visibleChunks,
} from '@/components/admin/translation-chunks/translationChunks.utils';
import {
  refusalText,
  rewriteRefusalText,
} from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  TranslationChunk,
  TranslationChunkRetry,
  TranslationReportChapter,
} from '@/types/api-schema';

/**
 * F05-7v-b: подписи отказов повтора и правки — своя на каждый код (карточка F05-7v, «Для 7v-b»),
 * список глав экрана (решение арбитра `F05 | F05-7v-b`), фильтр флагов и тела запросов.
 */

const refusal = (statusCode: number, code: string, message: unknown = 'raw server text') =>
  new ApiError({
    message: Array.isArray(message) ? 'Bad Request' : String(message),
    statusCode,
    error: 'Error',
    data: { code, message },
  });

const chunkOf = (over: Partial<TranslationChunk> = {}): TranslationChunk => ({
  id: 'c1',
  chunkIndex: 0,
  firstBlock: 1,
  lastBlock: 2,
  status: 'done',
  flagReason: null,
  model: 'a/model',
  costUsd: '0.01',
  attempts: 1,
  remarks: [],
  editedAt: null,
  retry: null,
  blocks: [
    { n: 1, source: 'one', translation: 'uno' },
    { n: 2, source: 'two', translation: null },
  ],
  ...over,
});

const retryOf = (over: Partial<TranslationChunkRetry> = {}): TranslationChunkRetry => ({
  operationId: 'op1',
  status: 'pending',
  requestedModel: null,
  model: null,
  reason: null,
  reasonModels: [],
  costUsd: '0',
  operationStatus: 'active',
  pauseReason: null,
  spentUsd: '0',
  limitUsd: '1',
  ...over,
});

const chapterOf = (over: Partial<TranslationReportChapter> = {}): TranslationReportChapter => ({
  number: 1,
  status: 'written',
  flagReason: null,
  seamIndex: null,
  length: null,
  lengthLimit: null,
  chapterId: null,
  rewriteRefusal: null,
  findings: [],
  ...over,
});

describe('chunkRefusalText', () => {
  it.each([
    [409, 'RUN_ACTIVE', /pause the run first/],
    [409, 'RETRY_IN_PROGRESS', /wait for that retry to finish/],
    [409, 'DRAFT_MISSING', /finished without a draft version/],
    [409, 'CHUNK_SOURCE_CHANGED', /the piece no longer matches it/],
    [409, 'CHUNK_EDIT_CONFLICT', /changed at the same time/],
    [409, 'CHECK_MODEL_SAME_FAMILY', /no model of another family than this model/],
    [409, 'LLM_OPERATION_NOT_RESUMABLE', /The retry cannot be resumed/],
    [409, 'LLM_OPERATION_NOT_CANCELLABLE', /The retry is already finished/],
    [409, 'LLM_NO_PRICE', /no fixed price/],
    [409, 'LLM_STAGE_DISABLED', /switched off/],
    [400, 'LLM_MODEL_UNKNOWN', /not in the OpenRouter list/],
    [503, 'LLM_DISABLED', /OpenRouter key is not configured/],
  ])('%i %s — своя подпись', (status, code, text) => {
    expect(chunkRefusalText(refusal(status, code))).toMatch(text);
  });

  const codes: Array<[number, string]> = [
    [409, 'RUN_ACTIVE'],
    [409, 'RETRY_IN_PROGRESS'],
    [409, 'DRAFT_MISSING'],
    [409, 'CHUNK_SOURCE_CHANGED'],
    [409, 'CHUNK_EDIT_CONFLICT'],
    [409, 'CHECK_MODEL_SAME_FAMILY'],
    [409, 'LLM_NO_PRICE'],
    [409, 'LLM_STAGE_DISABLED'],
    [400, 'LLM_MODEL_UNKNOWN'],
    [503, 'LLM_DISABLED'],
  ];

  it('у каждого кода своя подпись, а не текст сервера', () => {
    const texts = codes.map(([status, code]) => chunkRefusalText(refusal(status, code)));
    for (const text of texts) expect(text).not.toBe('raw server text');
    expect(new Set(texts).size).toBe(codes.length);
  });

  it('RETRY_IN_PROGRESS у куска и у «продолжить» запуска — разные подписи', () => {
    const error = refusal(409, 'RETRY_IN_PROGRESS');
    expect(chunkRefusalText(error)).not.toBe(refusalText(error));
  });

  it('CHUNK_BLOCKS_INVALID показывает список отказов из message', () => {
    const text = chunkRefusalText(
      refusal(400, 'CHUNK_BLOCKS_INVALID', ['block 3: tag <div> not allowed', 'block 7 missing'])
    );
    expect(text).toContain('block 3: tag <div> not allowed; block 7 missing');
  });
});

describe('rewriteRefusalText и retryFailedText', () => {
  it.each([
    ['CHAPTER_EDITED_MANUALLY', /edited by hand after it was written/],
    ['VERSION_NOT_DRAFT', /no longer a draft/],
    ['DRAFT_DELETED', /draft version was deleted/],
    ['SOURCE_CHANGED', /source chapter changed after translation/],
    ['CHAPTER_TOO_LONG', /did not assemble: the chapter is longer than the chapter limit/],
  ])('перезапись %s — своя подпись', (code, text) => {
    expect(rewriteRefusalText(code)).toMatch(text);
  });

  it.each([
    ['SOURCE_CHANGED', /changed during the retry/],
    ['CHUNK_TOO_LONG', /does not fit the model context/],
    ['CHUNK_INVALID_RESPONSE', /answer for a piece was not valid/],
    ['RETRY_CANCELLED', /the retry was cancelled/],
    ['RETRY_NOT_APPLIED', /the result was not applied/],
  ])('отказ попытки %s — своя подпись', (code, text) => {
    expect(retryFailedText(code)).toMatch(text);
  });

  it('итог правки: переписана, главы ещё нет (null), отказ с причиной', () => {
    const chunk = chunkOf();
    expect(editedText({ chunk, chapterRewritten: true, reason: null })).toMatch(/rewritten/);
    expect(editedText({ chunk, chapterRewritten: false, reason: null })).toMatch(
      /not in the draft yet — the run writes it/
    );
    expect(editedText({ chunk, chapterRewritten: false, reason: 'VERSION_NOT_DRAFT' })).toMatch(
      /was not rewritten: the version is no longer a draft/
    );
  });

  it('каждый код перезаписи — своя подпись, коды сборки — словами находок', () => {
    const codes = [
      'CHAPTER_EDITED_MANUALLY',
      'VERSION_NOT_DRAFT',
      'DRAFT_DELETED',
      'SOURCE_CHANGED',
      'CHAPTER_TOO_LONG',
      'CHUNK_UNTRANSLATED',
      'CHUNKS_MISMATCH',
    ];
    const texts = codes.map(rewriteRefusalText);
    for (const [i, text] of texts.entries()) expect(text).not.toContain(codes[i]);
    expect(new Set(texts).size).toBe(codes.length);
  });

  it('каждая причина отказа попытки — своя подпись', () => {
    const codes = [
      'SOURCE_CHANGED',
      'CHUNK_TOO_LONG',
      'CHUNK_INVALID_RESPONSE',
      'RETRY_CANCELLED',
      'RETRY_NOT_APPLIED',
    ];
    const texts = codes.map(retryFailedText);
    for (const [i, text] of texts.entries()) expect(text).not.toContain(codes[i]);
    expect(new Set(texts).size).toBe(codes.length);
  });
});

describe('retryStateOf', () => {
  it('итог по статусу попытки, пауза — по операции', () => {
    expect(retryStateOf(null)).toBeNull();
    expect(retryStateOf(retryOf({ status: 'applied', operationStatus: 'done' }))).toBe('applied');
    expect(retryStateOf(retryOf({ status: 'failed', operationStatus: 'cancelled' }))).toBe(
      'failed'
    );
    expect(retryStateOf(retryOf({ status: 'translated' }))).toBe('running');
    // Попытка открыта, а операции нет в работе: не «идёт» — иначе кнопки встанут навсегда.
    expect(retryStateOf(retryOf({ status: 'translated', operationStatus: 'cancelled' }))).toBe(
      'ended'
    );
    expect(retryStateOf(retryOf({ status: 'translated', operationStatus: null }))).toBe('ended');
    expect(
      retryStateOf(
        retryOf({ status: 'checked', operationStatus: 'paused', pauseReason: 'LIMIT_REACHED' })
      )
    ).toBe('paused');
  });
});

describe('chapterOptionsOf', () => {
  it('главы отчёта плюс глава хода, если её там нет, — «не собрана», по номеру', () => {
    const options = chapterOptionsOf([chapterOf({ number: 1 }), chapterOf({ number: 2 })], {
      chapterNumber: 3,
    });
    expect(options.map((o) => [o.number, o.assembled])).toEqual([
      [1, true],
      [2, true],
      [3, false],
    ]);
  });

  it('глава хода из отчёта не дублируется; номера сверх этих не выдумываются', () => {
    expect(chapterOptionsOf([chapterOf({ number: 2 })], { chapterNumber: 2 })).toHaveLength(1);
    expect(chapterOptionsOf([], { chapterNumber: null })).toEqual([]);
  });

  it('находки до повтора или правки (stale) главу флагнутой не делают', () => {
    const [stale, live] = chapterOptionsOf(
      [
        chapterOf({ number: 1, findings: [{ code: 'SEAM_BROKEN', stale: true }] }),
        chapterOf({ number: 2, findings: [{ code: 'SEAM_BROKEN' }] }),
      ],
      undefined
    );
    expect(stale.flagged).toBe(false);
    expect(live.flagged).toBe(true);
  });
});

describe('visibleChunks', () => {
  it('«только флаги» оставляет флагнутые, без фильтра — все', () => {
    const chunks = [chunkOf({ id: 'a' }), chunkOf({ id: 'b', status: 'flagged' })];
    expect(visibleChunks(chunks, true).map((c) => c.id)).toEqual(['b']);
    expect(visibleChunks(chunks, false).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('кусок, с которым работали, под фильтром остаётся', () => {
    const chunks = [chunkOf({ id: 'a' }), chunkOf({ id: 'b', status: 'flagged' })];
    expect(visibleChunks(chunks, true, new Set(['a'])).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('повтор идёт у куска главы — только при активной операции', () => {
    expect(chapterRetrying([chunkOf({ retry: retryOf({ operationStatus: 'active' }) })])).toBe(
      true
    );
    expect(chapterRetrying([chunkOf({ retry: retryOf({ operationStatus: 'paused' }) })])).toBe(
      false
    );
    expect(chapterRetrying([chunkOf()])).toBe(false);
  });
});

describe('тела повтора и правки', () => {
  it('лимит повтора обязателен и больше нуля', () => {
    expect(isRetryLimitOk('0')).toBe(false);
    expect(isRetryLimitOk('0.00')).toBe(false);
    expect(isRetryLimitOk('')).toBe(false);
    expect(isRetryLimitOk('  ')).toBe(false);
    expect(isRetryLimitOk('abc')).toBe(false);
    expect(isRetryLimitOk('0.5')).toBe(true);
  });

  it('пустая модель не уходит', () => {
    expect(retryRequest(null, ' 0.5 ')).toEqual({ limitUsd: '0.5' });
    expect(retryRequest('x/y', '1')).toEqual({ model: 'x/y', limitUsd: '1' });
  });

  it('правка шлёт все блоки куска по номеру', () => {
    expect(editRequest(chunkOf(), { 2: 'dos' })).toEqual({
      blocks: [
        { n: 1, text: 'uno' },
        { n: 2, text: 'dos' },
      ],
    });
  });
});
