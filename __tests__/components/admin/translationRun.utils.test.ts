import { describe, expect, it } from 'vitest';
import {
  blockText,
  chapterText,
  failedText,
  findingText,
  mismatchText,
  pauseActionOf,
  refusalText,
  startRunRequest,
  isLimitOk,
  operationStatusText,
  runStatusText,
  stageName,
  stageText,
  stepFailureText,
  toModelOptions,
} from '@/components/admin/translation-run/translationRun.utils';
import { ApiError } from '@/types/api';
import type {
  LlmOperation,
  TranslationBlockReason,
  TranslationRun,
  TranslationRunLanguage,
  TranslationSource,
} from '@/types/api-schema';

const operation = (over: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-run',
  kind: 'translation_run',
  status: 'active',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '10.00000000',
  reservedUsd: '0.00000000',
  spentUsd: '1.00000000',
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
  ...over,
});

const language = (over: Partial<TranslationRunLanguage> = {}): TranslationRunLanguage => ({
  language: 'es',
  status: 'running',
  stage: 'translate',
  reason: null,
  reasonText: null,
  reasonModels: [],
  reasonUsd: null,
  chapterNumber: 1,
  chapterPosition: 1,
  chaptersTotal: 3,
  chunksDone: 0,
  chunksTotal: 2,
  flaggedChunks: 0,
  flaggedChapters: 0,
  glossaryId: 'g1',
  blockedByOperationId: null,
  draftVersionId: null,
  ...over,
});

const translationRun = (over: Partial<TranslationRun> = {}): TranslationRun => ({
  id: 'r1',
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  dossierId: 'd1',
  stageModels: {},
  operation: operation(),
  operations: [],
  languages: [language()],
  createdAt: '2026-10-24T00:00:00.000Z',
  ...over,
});

const source = (over: Partial<TranslationSource> = {}): TranslationSource => ({
  canTranslate: false,
  reason: null,
  sourceVersionId: null,
  sourceLanguage: 'fr',
  originalLanguageRaw: 'French',
  originalLanguageMismatch: false,
  targets: [],
  ...over,
});

const paused = (pauseReason: LlmOperation['pauseReason'], over: Partial<TranslationRun> = {}) =>
  translationRun({ operation: operation({ status: 'paused', pauseReason }), ...over });

describe('Подсказка неактивной кнопки перевода (F05-7, §2.1)', () => {
  const reasons: TranslationBlockReason[] = [
    'SOURCE_LANGUAGE_UNKNOWN',
    'ORIGINAL_VERSION_MISSING',
    'ENGLISH_VERSION_MISSING',
    'NOT_ORIGINAL_VERSION',
    'NOT_ENGLISH_VERSION',
    'SOURCE_HAS_NO_CHAPTERS',
    'INTAKE_TARGETS_MISSING',
    'NO_AVAILABLE_TARGETS',
  ];

  it('у каждой причины своя подпись', () => {
    const texts = reasons.map((reason) => blockText(source({ reason })));
    expect(texts.every((t) => t.length > 0)).toBe(true);
    expect(new Set(texts).size).toBe(reasons.length);
  });

  it('нет версии на языке оригинала — подпись с кодом языка (Р14)', () => {
    expect(blockText(source({ reason: 'ORIGINAL_VERSION_MISSING', sourceLanguage: 'fr' }))).toBe(
      'Upload a version in the original language (fr).'
    );
  });

  it('расхождение поля «язык оригинала» видно, без расхождения подписи нет', () => {
    expect(mismatchText(source({ originalLanguageMismatch: true }))).toContain('French');
    expect(mismatchText(source())).toBeNull();
  });
});

describe('Действие на причину паузы запуска (F05-7, шаг 3)', () => {
  it('идущий запуск — без действия паузы', () => {
    expect(pauseActionOf(translationRun())).toBeNull();
  });

  it('лимит запуска меньше досье или глоссария до трат — своя пауза с суммой (решение арбитра, /fix В2)', () => {
    expect(
      pauseActionOf(
        paused('LIMIT_REACHED', {
          languages: [
            language({ stage: 'dossier', reason: 'DOSSIER_LIMIT_TOO_LOW', reasonUsd: '0.052' }),
          ],
        })
      )
    ).toEqual({ kind: 'contextLimit', neededUsd: '0.052' });
  });

  it('несколько ждущих языков — наибольшая сумма: «продолжить» проходит у всех', () => {
    expect(
      pauseActionOf(
        paused('LIMIT_REACHED', {
          languages: [
            language({ language: 'es', reason: 'DOSSIER_LIMIT_TOO_LOW', reasonUsd: '0.5' }),
            language({ language: 'fr', reason: 'DOSSIER_LIMIT_TOO_LOW', reasonUsd: '1.25' }),
            language({ language: 'ru', reason: 'DOSSIER_LIMIT_TOO_LOW', reasonUsd: '0.9' }),
          ],
        })
      )
    ).toEqual({ kind: 'contextLimit', neededUsd: '1.25' });
  });

  it('пауза кнопкой, лимит, потолок, баланс, устаревшее досье — каждое своё', () => {
    expect(pauseActionOf(paused(null))).toEqual({ kind: 'manual' });
    expect(pauseActionOf(paused('LIMIT_REACHED'))).toEqual({ kind: 'limit' });
    expect(pauseActionOf(paused('CEILING_REACHED'))).toEqual({ kind: 'ceiling' });
    expect(pauseActionOf(paused('INSUFFICIENT_FUNDS'))).toEqual({ kind: 'funds' });
    expect(pauseActionOf(paused('DOSSIER_STALE'))).toEqual({ kind: 'stale' });
  });

  it('отказ шага из-за отменённого или упавшего досье — новый запуск, не «продолжить»', () => {
    expect(
      pauseActionOf(paused('STEP_FAILED', { languages: [language({ reason: 'STEP_FAILED' })] }))
    ).toEqual({ kind: 'contextFailed' });
  });

  it('причина паузы, которой экран не знает, — общее «продолжить» с кодом', () => {
    const unknown = paused(null);
    (unknown.operation as { pauseReason: unknown }).pauseReason = 'SOMETHING_NEW';
    expect(pauseActionOf(unknown)).toEqual({ kind: 'unknown', reason: 'SOMETHING_NEW' });
  });

  it('отказ шага — код причины языка', () => {
    expect(
      pauseActionOf(
        paused('STEP_FAILED', { languages: [language({ reason: 'LLM_PROVIDER_ERROR' })] })
      )
    ).toEqual({ kind: 'step', reason: 'LLM_PROVIDER_ERROR' });
  });

  it.each([
    ['LLM_NO_COMPLIANT_PROVIDER', 'translate'],
    ['CHECK_NO_COMPLIANT_PROVIDER', 'check_semantic'],
    ['METADATA_NO_COMPLIANT_PROVIDER', 'metadata'],
    ['FINAL_CHECK_NO_COMPLIANT_PROVIDER', 'final_check'],
  ])('без провайдера (%s) — модель этапа %s и модели отказа', (reason, stage) => {
    expect(
      pauseActionOf(
        paused('NO_COMPLIANT_PROVIDER', {
          languages: [language({ reason, reasonModels: ['a/x', 'b/y'] })],
        })
      )
    ).toEqual({ kind: 'provider', stage, models: ['a/x', 'b/y'] });
  });

  it('ждёт досье — операция досье по ссылке языка', () => {
    const builder = operation({
      id: 'op-dossier',
      kind: 'dossier',
      status: 'paused',
      pauseReason: 'CEILING_REACHED',
    });
    expect(
      pauseActionOf(
        paused('DOSSIER_PAUSED', {
          operations: [builder],
          languages: [language({ reason: 'DOSSIER_PAUSED', blockedByOperationId: 'op-dossier' })],
        })
      )
    ).toEqual({ kind: 'dossier', operation: builder });
  });
});

describe('Подписи кодов', () => {
  it.each([
    'LANGUAGE_MISMATCH',
    'FOREIGN_SHARE',
    'FOREIGN_BLOCK',
    'LENGTH_OUT_OF_RANGE',
    'BLOCKS_MISMATCH',
    'BLOCK_EMPTY',
    'SERVICE_PHRASE',
    'TRUNCATED',
    'JEV_LANGUAGE_MISMATCH',
    'SEMANTIC_FAIL',
    'NOT_INDEPENDENT',
    'CHECK_INPUT_TOO_LONG',
    'CHECK_STAGE_UNAVAILABLE',
    'CHUNK_CHECK_INVALID_RESPONSE',
    'CHUNKS_MISMATCH',
    'SEAM_BROKEN',
    'FINAL_CHECK_FAIL',
    'GLOSSARY_SOURCE_FORM',
    'TITLE_MISSING',
    'SOURCE_CHANGED',
  ])('флаг %s в отчёте — подпись, а не код', (code) => {
    expect(findingText(code)).not.toBe(code);
  });

  it('неизвестный код — как есть; отказ шага — подпись по коду', () => {
    expect(findingText('SOMETHING_NEW')).toBe('SOMETHING_NEW');
    expect(stepFailureText('LLM_PROVIDER_ERROR')).toBe('the model provider refused the request');
    expect(stepFailureText('NEW_CODE')).toBe('NEW_CODE');
  });
});

describe('Мелкие подписи и проверки', () => {
  it('лимит: пусто — умолчание сервера, деньги до восьми знаков; запятая и мусор — нет', () => {
    expect(isLimitOk('')).toBe(true);
    expect(isLimitOk('  ')).toBe(true);
    expect(isLimitOk('7.5')).toBe(true);
    expect(isLimitOk('0.12345678')).toBe(true);
    expect(isLimitOk('1,5')).toBe(false);
    expect(isLimitOk('0.123456789')).toBe(false);
    expect(isLimitOk('abc')).toBe(false);
  });

  it('этапы, статусы, глава N из M, пункт модели — словами', () => {
    expect(stageName('check_semantic')).toBe('Meaning check');
    expect(stageName('check_language_jev')).toBe('Language review');
    expect(stageName('new_stage')).toBe('new_stage');
    expect(runStatusText(operation({ status: 'done' }))).toBe('finished');
    expect(operationStatusText(operation({ status: 'paused', pauseReason: null }))).toBe(
      'paused: with the Pause button'
    );
    expect(chapterText(language({ chapterPosition: null, chaptersTotal: 4 }))).toBe('4 chapters');
    expect(chapterText(language({ chapterPosition: 2, chaptersTotal: 4 }))).toBe('chapter 2 of 4');
    expect(
      toModelOptions([
        {
          id: 'a/b',
          name: 'AB',
          contextLength: null,
          inputPerMTokUsd: null,
          outputPerMTokUsd: null,
        },
      ] as never)
    ).toEqual([{ value: 'a/b', label: 'AB (a/b) · no fixed price' }]);
  });
});

describe('Подписи языка', () => {
  it('VERSION_EXISTS и CREATE_REJECTED у упавшего языка — свои подписи, второй с текстом сервиса', () => {
    expect(failedText(language({ status: 'failed', reason: 'VERSION_EXISTS' }))).toBe(
      'A version in this language already exists.'
    );
    expect(
      failedText(
        language({ status: 'failed', reason: 'CREATE_REJECTED', reasonText: 'Not in intake' })
      )
    ).toBe('The draft version was refused: Not in intake');
  });

  it('сборка с черновиком — запись глав в черновик (решение арбитра F05 | F05-7)', () => {
    expect(stageText(language({ stage: 'assemble' }))).toBe('assembling chapters');
    expect(stageText(language({ stage: 'assemble', draftVersionId: 'd' }))).toBe(
      'writing chapters into the draft'
    );
  });
});

describe('Тело старта и отказы', () => {
  it('пустой лимит и модель по умолчанию не уходят', () => {
    expect(startRunRequest(['es', 'fr'], null, ' ')).toEqual({ languages: ['es', 'fr'] });
    expect(startRunRequest(['es'], 'a/b', '5')).toEqual({
      languages: ['es'],
      translateModel: 'a/b',
      limitUsd: '5',
    });
  });

  it('отказ старта по недоступному языку называет язык и причину', () => {
    const error = new ApiError({
      message: 'Conflict',
      statusCode: 409,
      error: 'Conflict',
      data: {
        code: 'TRANSLATION_TARGET_UNAVAILABLE',
        languages: [{ language: 'fr', reason: 'TRANSLATION_IN_PROGRESS' }],
      },
    });
    expect(refusalText(error)).toContain('FR: a translation into it is in progress');
  });
});
