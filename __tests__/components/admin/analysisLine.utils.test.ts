import { describe, expect, it } from 'vitest';
import {
  analysisLineOf,
  analysisReasonText,
  sumAnalysisSpent,
} from '@/components/admin/translation-run/analysisLine.utils';
import type { TranslationRunAnalysis } from '@/types/api-schema';

const analysis = (over: Partial<TranslationRunAnalysis> = {}): TranslationRunAnalysis => ({
  status: 'ready',
  reason: null,
  draftId: 'd1',
  operationStatus: 'done',
  pauseReason: null,
  stepsDone: 5,
  stepsTotal: 5,
  flaggedItems: 0,
  failedItems: 0,
  coreReady: true,
  spentUsd: '0.1',
  ...over,
});

const line = (
  a: TranslationRunAnalysis | null,
  status: 'running' | 'done' | 'failed' | 'cancelled' | 'pending' = 'done'
) => analysisLineOf(true, { status, analysis: a });

describe('Подпись анализа языка запуска (F07-3b)', () => {
  it('без Write Analysis строки нет', () => {
    expect(analysisLineOf(false, { status: 'done', analysis: analysis() })).toBeNull();
    expect(analysisLineOf(false, { status: 'running', analysis: null })).toBeNull();
  });

  it('анализа ещё нет: язык идёт — ждёт перевода; упал или отменён — не начат; done без анализа — без строки', () => {
    expect(line(null, 'running')).toEqual({
      text: 'Analysis: waiting for translation',
      link: null,
    });
    expect(line(null, 'failed')?.text).toBe('Analysis: not started — translation failed');
    expect(line(null, 'cancelled')?.text).toBe('Analysis: not started — translation cancelled');
    expect(line(null, 'done')).toBeNull();
  });

  it('ход: идёт шаг после законченных «N of M»; пауза и конец операции — со ссылкой на вкладку', () => {
    expect(line(analysis({ status: 'pending', stepsDone: 0, stepsTotal: null }))).toEqual({
      text: 'Analysis: waiting to start',
      link: null,
    });
    expect(line(analysis({ status: 'building', operationStatus: 'active', stepsDone: 2 }))).toEqual(
      { text: 'Analysis: writing, step 3 of 5', link: null }
    );
    expect(
      line(analysis({ status: 'building', operationStatus: 'active', stepsDone: 5 }))?.text
    ).toBe('Analysis: writing, step 5 of 5');
    const paused = line(
      analysis({ status: 'building', operationStatus: 'paused', pauseReason: 'CEILING_REACHED' })
    );
    expect(paused?.text).toMatch(/^Analysis: paused — /);
    expect(paused?.link).toBe('Open the Analysis tab');
    expect(line(analysis({ status: 'building', operationStatus: 'cancelled' }))).toEqual({
      text: 'Analysis: stopped — its operation was cancelled',
      link: 'Open the Analysis tab',
    });
  });

  it('готов: done — ядро собрано и нет упавших блоков; флаги — по блокам; иначе partly done с перечнем', () => {
    expect(line(analysis())).toEqual({ text: 'Analysis: done', link: null });
    expect(line(analysis({ flaggedItems: 2 }))).toEqual({
      text: 'Analysis: done, blocks with model flags: 2',
      link: 'Open the Analysis tab',
    });
    expect(line(analysis({ coreReady: false }))).toEqual({
      text: 'Analysis: partly done — core not ready',
      link: 'Open the Analysis tab',
    });
    expect(line(analysis({ failedItems: 1, coreReady: false }))?.text).toBe(
      'Analysis: partly done — 1 block failed, core not ready'
    );
    expect(line(analysis({ failedItems: 2 }))?.text).toBe(
      'Analysis: partly done — 2 blocks failed'
    );
  });

  it('не начат и не удался — с причиной словами анализа, отброшен — без ссылки', () => {
    expect(line(analysis({ status: 'skipped', reason: 'AUTOSTART_SKIPPED_EXISTING' }))).toEqual({
      text: 'Analysis: not started — the version already has a finished analysis run',
      link: 'Open the Analysis tab',
    });
    expect(
      line(analysis({ status: 'skipped', reason: 'AUTOSTART_SKIPPED_IN_PROGRESS' }))?.link
    ).toBe('Open the Analysis tab');
    expect(line(analysis({ status: 'skipped', reason: 'LLM_CEILING_REACHED' }))).toEqual({
      text: 'Analysis: not started — the spending ceiling is reached: raise it in LLM settings',
      link: 'Write Analysis on the Analysis tab',
    });
    expect(line(analysis({ status: 'failed', reason: 'AUTOSTART_FAILED' }))).toEqual({
      text: 'Analysis: failed — the start of the analysis failed',
      link: 'Open the Analysis tab',
    });
    expect(line(analysis({ status: 'discarded' }))).toEqual({
      text: 'Analysis: discarded on the Analysis tab',
      link: null,
    });
    // Отказ старта — фразой вкладки Analysis, а не пересказа.
    expect(analysisReasonText('SOURCE_HAS_NO_CHAPTERS')).toBe(
      'this version has no chapter text to write the analysis from'
    );
    expect(analysisReasonText('SOME_NEW_CODE')).toBe('SOME_NEW_CODE');
  });

  it('траты Analysis отчёта — сумма языков с анализом; ни у одного — null', () => {
    expect(
      sumAnalysisSpent([
        { analysis: { spentUsd: '0.1' } },
        { analysis: null },
        { analysis: { spentUsd: '0.25' } },
      ])
    ).toBe('0.35');
    expect(sumAnalysisSpent([{ analysis: null }])).toBeNull();
  });
});
