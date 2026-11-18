import { describe, expect, it } from 'vitest';
import { costRows, runOutcome } from '@/components/admin/translation-run/runOverview.utils';
import type {
  LlmOperation,
  TranslationReportLanguage,
  TranslationRun,
  TranslationRunAnalysis,
  TranslationRunLanguage,
  TranslationRunReport,
  TranslationRunSummary,
} from '@/types/api-schema';

/** Сводка экрана перевода: закончено ли всё и разбивка трат. */

const operation = (over: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-run',
  kind: 'translation_run',
  status: 'done',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '10',
  reservedUsd: '0',
  spentUsd: '1.31193477',
  createdAt: '2026-11-16T00:00:00.000Z',
  updatedAt: '2026-11-16T00:00:00.000Z',
  ...over,
});

const summary = (over: Partial<TranslationRunSummary> = {}): TranslationRunSummary => ({
  status: 'ready',
  reason: null,
  draftId: 'd',
  operationStatus: 'done',
  pauseReason: null,
  plannedSections: 4,
  sectionsDone: 4,
  fullDone: true,
  briefDone: true,
  flaggedTexts: 2,
  failedTexts: 0,
  spentUsd: '0.2',
  ...over,
});

const analysis = (over: Partial<TranslationRunAnalysis> = {}): TranslationRunAnalysis => ({
  status: 'ready',
  reason: null,
  draftId: 'd',
  operationStatus: 'done',
  pauseReason: null,
  stepsDone: 6,
  stepsTotal: 6,
  flaggedItems: 3,
  failedItems: 0,
  coreReady: true,
  spentUsd: '0.3',
  ...over,
});

const language = (over: Partial<TranslationRunLanguage> = {}): TranslationRunLanguage => ({
  language: 'es',
  status: 'done',
  stage: 'done',
  reason: null,
  reasonText: null,
  reasonModels: [],
  reasonUsd: null,
  chapterNumber: 4,
  chapterPosition: 4,
  chaptersTotal: 4,
  chunksDone: 8,
  chunksTotal: 8,
  flaggedChunks: 1,
  flaggedChapters: 1,
  glossaryId: 'g',
  blockedByOperationId: null,
  draftVersionId: 'dv',
  summary: summary(),
  analysis: analysis(),
  ...over,
});

const run = (over: Partial<TranslationRun> = {}): TranslationRun => ({
  id: 'r1',
  bookVersionId: 'v1',
  sourceLanguage: 'en',
  dossierId: 'd1',
  stageModels: {},
  operation: operation(),
  operations: [operation({ id: 'op-d', kind: 'dossier' })],
  languages: [language()],
  writeSummary: true,
  writeAnalysis: true,
  createdAt: '2026-11-16T00:00:00.000Z',
  ...over,
});

describe('runOutcome', () => {
  it('всё дошло — «Finished — everything is done», пометки модели сложены', () => {
    const o = runOutcome(run());
    expect(o.kind).toBe('done');
    expect(o.title).toBe('Finished — everything is done');
    expect(o.problems).toEqual([]);
    expect(o.modelFlags).toBe(1 + 2 + 3);
  });

  it('анализ FR без ядра — закончено, но не всё, с названной проблемой', () => {
    const o = runOutcome(
      run({
        languages: [
          language(),
          language({ language: 'fr', analysis: analysis({ coreReady: false }) }),
        ],
      })
    );
    expect(o.kind).toBe('attention');
    expect(o.problems).toEqual(['FR: analysis partly done']);
  });

  it('упавший язык и не начатый пересказ — названы по языку', () => {
    const o = runOutcome(
      run({
        languages: [
          language({ language: 'pt', status: 'failed', stage: 'failed', summary: null }),
          language({ summary: summary({ status: 'skipped', reason: 'X' }) }),
        ],
      })
    );
    expect(o.kind).toBe('attention');
    expect(o.problems).toEqual(['PT: translation failed', 'ES: summary not started']);
  });

  it('перевод закончен, а анализ ещё пишется — «In progress»', () => {
    const o = runOutcome(
      run({
        languages: [
          language({ analysis: analysis({ status: 'building', operationStatus: 'active' }) }),
        ],
      })
    );
    expect(o.kind).toBe('running');
  });

  it('идёт сам запуск — «In progress», считаются переведённые языки', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'active' }),
        languages: [
          language(),
          language({ language: 'fr', status: 'running', stage: 'translate' }),
        ],
      })
    );
    expect(o).toMatchObject({ kind: 'running', languagesTranslated: 1, languagesTotal: 2 });
  });

  it('пауза операции раздела — «Paused», а не «In progress»', () => {
    const o = runOutcome(
      run({
        languages: [
          language({
            summary: summary({
              status: 'building',
              operationStatus: 'paused',
              pauseReason: 'LIMIT_REACHED',
            }),
          }),
        ],
      })
    );
    expect(o.kind).toBe('paused');
  });

  it('отменённый запуск — «Cancelled»', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'cancelled' }),
        languages: [
          language({ status: 'cancelled', stage: 'cancelled', summary: null, analysis: null }),
        ],
      })
    );
    expect(o.kind).toBe('cancelled');
  });
});

const reportLanguage = (over: Partial<TranslationReportLanguage>): TranslationReportLanguage =>
  ({ language: 'es', summary: null, analysis: null, ...over }) as TranslationReportLanguage;

const report = (over: Partial<TranslationRunReport> = {}): TranslationRunReport => ({
  id: 'r1',
  bookVersionId: 'v1',
  languages: [
    reportLanguage({ language: 'es', summary: summary(), analysis: analysis() }),
    reportLanguage({ language: 'fr', summary: summary({ spentUsd: '0.1' }), analysis: null }),
  ],
  costs: [],
  breakdown: {
    languages: [
      { language: 'es', translationUsd: '0.4', glossaryUsd: '0.05' },
      { language: 'fr', translationUsd: '0.5', glossaryUsd: '0' },
    ],
    dossierUsd: '0.01',
    unattributedUsd: '0',
  },
  inFlight: { calls: 0, reservedUsd: '0' },
  totalUsd: '1.56',
  ...over,
});

describe('costRows', () => {
  it('язык: перевод с глоссарием, Summary, Analysis и их сумма; досье отдельной строкой, нулевой остаток не показан', () => {
    expect(costRows(report())).toEqual([
      {
        label: 'ES',
        translationUsd: '0.45',
        summaryUsd: '0.2',
        analysisUsd: '0.3',
        totalUsd: '0.95',
      },
      { label: 'FR', translationUsd: '0.5', summaryUsd: '0.1', analysisUsd: null, totalUsd: '0.6' },
      {
        label: 'Dossier (all languages)',
        translationUsd: null,
        summaryUsd: null,
        analysisUsd: null,
        totalUsd: '0.01',
      },
    ]);
  });

  it('траты без языка — строкой «Other»', () => {
    const rows = costRows(
      report({ breakdown: { languages: [], dossierUsd: '0', unattributedUsd: '0.02' } })
    );
    expect(rows.map((r) => [r.label, r.totalUsd])).toEqual([['Other', '0.02']]);
  });
});

describe('runOutcome: раздел встал, а не идёт', () => {
  it.each([
    ['building, операция упала', { status: 'building', operationStatus: 'failed' }, 'stopped'],
    [
      'building, операция отменена',
      { status: 'building', operationStatus: 'cancelled' },
      'stopped',
    ],
    ['discarded', { status: 'discarded', operationStatus: 'done' }, 'discarded'],
    ['failed', { status: 'failed', operationStatus: 'failed', reason: 'X' }, 'failed'],
  ] as const)('пересказ %s — не «всё готово»', (_, over, word) => {
    const o = runOutcome(run({ languages: [language({ summary: summary(over) })] }));
    expect(o.kind).toBe('attention');
    expect(o.problems).toEqual([`ES: summary ${word}`]);
  });

  it('язык готов, а раздела ещё нет (операция автозапуска не создана или черновик удалён) — «not written yet», не «всё готово»', () => {
    const o = runOutcome(run({ languages: [language({ analysis: null })] }));
    expect(o).toMatchObject({ kind: 'attention', problems: ['ES: analysis not written yet'] });
  });

  it('раздел выключен у запуска — его отсутствие не проблема', () => {
    const o = runOutcome(run({ writeAnalysis: false, languages: [language({ analysis: null })] }));
    expect(o.kind).toBe('done');
  });

  it('упала сама операция запуска — первой строкой, исход «не всё»', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'failed' }),
        languages: [language({ language: 'fr', status: 'failed', stage: 'failed', summary: null })],
      })
    );
    expect(o.kind).toBe('attention');
    expect(o.problems).toEqual(['the run itself failed', 'FR: translation failed']);
  });

  it('пауза досье — «Paused»', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'paused' }),
        operations: [operation({ id: 'op-d', kind: 'dossier', status: 'paused' })],
      })
    );
    expect(o.kind).toBe('paused');
  });
});

describe('costRows: отказы формы', () => {
  it('разбивки в ответе нет (бэкенд старее экрана) — строк нет, а не падение', () => {
    const old = { ...report() } as Partial<TranslationRunReport>;
    delete old.breakdown;
    expect(costRows(old as TranslationRunReport)).toEqual([]);
  });

  it('сумма раздела не по форме денег — прочерк и в итоге строки, а не ноль', () => {
    const rows = costRows(
      report({
        languages: [reportLanguage({ language: 'es', summary: summary({ spentUsd: 'abc' }) })],
        breakdown: {
          languages: [{ language: 'es', translationUsd: '0.4', glossaryUsd: '0' }],
          dossierUsd: '0',
          unattributedUsd: '0',
        },
      })
    );
    expect(rows).toEqual([
      { label: 'ES', translationUsd: '0.4', summaryUsd: 'abc', analysisUsd: null, totalUsd: null },
    ]);
  });

  it('досье и остаток вместе — обе строки после языков', () => {
    const rows = costRows(
      report({ breakdown: { languages: [], dossierUsd: '0.01', unattributedUsd: '0.02' } })
    );
    expect(rows.map((r) => r.label)).toEqual(['Dossier (all languages)', 'Other']);
  });
});

describe('runOutcome: раздел без операции, пауза при идущем запуске, пересказ не целиком', () => {
  it('building чужой операцией (перезапуск с вкладки, operationStatus null) — «being written on its tab», не «stopped» и не «всё готово»', () => {
    const o = runOutcome(
      run({
        languages: [language({ summary: summary({ status: 'building', operationStatus: null }) })],
      })
    );
    expect(o).toMatchObject({
      kind: 'attention',
      problems: ['ES: summary being written on its tab'],
    });
  });

  it('пауза операции раздела у выключенного раздела не делает исход «Paused» без строки', () => {
    const o = runOutcome(
      run({
        writeSummary: false,
        languages: [
          language({ summary: summary({ status: 'building', operationStatus: 'paused' }) }),
        ],
      })
    );
    expect(o.kind).toBe('done');
    expect(o.problems).toEqual([]);
  });

  it('упавший и отменённый языки не считаются переведёнными', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'active' }),
        languages: [
          language({ language: 'fr', status: 'failed', stage: 'failed', summary: null }),
          language({ language: 'es', status: 'cancelled', stage: 'cancelled', summary: null }),
          language({ language: 'pt', status: 'running', stage: 'translate', summary: null }),
        ],
      })
    );
    expect(o).toMatchObject({ kind: 'running', languagesTranslated: 0, languagesTotal: 3 });
  });

  it('пауза пересказа одного языка видна, пока другой ещё переводится', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'active' }),
        languages: [
          language({
            summary: summary({
              status: 'building',
              operationStatus: 'paused',
              pauseReason: 'LIMIT_REACHED',
            }),
          }),
          language({
            language: 'fr',
            status: 'running',
            stage: 'translate',
            summary: null,
            analysis: null,
          }),
        ],
      })
    );
    expect(o.kind).toBe('running');
    expect(o.problems).toEqual(['ES: summary paused']);
  });

  it.each([
    ['без полного текста', { fullDone: false }],
    ['без очень короткого', { briefDone: false }],
    ['с упавшим текстом', { failedTexts: 1 }],
  ] as const)('готовый пересказ %s — «partly done»', (_, over) => {
    const o = runOutcome(run({ languages: [language({ summary: summary(over) })] }));
    expect(o).toMatchObject({ kind: 'attention', problems: ['ES: summary partly done'] });
  });
});

describe('runOutcome: пауза самого запуска видна, пока пишется раздел', () => {
  it('запуск на паузе, Summary другого языка ещё пишется — «In progress» и строка паузы', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'paused', pauseReason: null }),
        languages: [
          language({ summary: summary({ status: 'building', operationStatus: 'active' }) }),
          language({
            language: 'fr',
            status: 'running',
            stage: 'translate',
            summary: null,
            analysis: null,
          }),
        ],
      })
    );
    expect(o.kind).toBe('running');
    expect(o.problems).toEqual(['translation paused']);
  });

  it('пауза глоссария у незаконченного запуска — строкой, исход «Paused»', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'paused' }),
        operations: [operation({ id: 'op-g', kind: 'dossier', status: 'paused' })],
      })
    );
    expect(o).toMatchObject({
      kind: 'paused',
      problems: ['dossier or glossary paused', 'translation paused'],
    });
  });

  it('готовый анализ с упавшим блоком — «partly done»', () => {
    const o = runOutcome(
      run({ languages: [language({ analysis: analysis({ failedItems: 1 }) })] })
    );
    expect(o).toMatchObject({ kind: 'attention', problems: ['ES: analysis partly done'] });
  });
});

describe('costRows: перевод не по форме денег', () => {
  it('прочерк в переводе и в итоге строки, а не ложная сумма', () => {
    const rows = costRows(
      report({
        breakdown: {
          languages: [{ language: 'es', translationUsd: 'abc', glossaryUsd: '0' }],
          dossierUsd: '0',
          unattributedUsd: '0',
        },
      })
    );
    expect(rows[0]).toMatchObject({ label: 'ES', translationUsd: null, totalUsd: null });
  });
});

describe('runOutcome: общая пауза досье у законченного запуска', () => {
  it('отменённый запуск при паузе общего досье — «Cancelled», не «Paused»', () => {
    const o = runOutcome(
      run({
        operation: operation({ status: 'cancelled' }),
        operations: [operation({ id: 'op-d', kind: 'dossier', status: 'paused' })],
        languages: [
          language({ status: 'cancelled', stage: 'cancelled', summary: null, analysis: null }),
        ],
      })
    );
    expect(o.kind).toBe('cancelled');
    expect(o.problems).not.toContain('dossier or glossary paused');
  });
});
