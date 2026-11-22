import { describe, expect, it } from 'vitest';
import {
  isWorldComplete,
  sumWorldSpent,
  worldLineOf,
  worldReasonText,
} from '@/components/admin/translation-run/worldLine.utils';
import type { TranslationRunAnalysis, TranslationRunWorld } from '@/types/api-schema';

const world = (over: Partial<TranslationRunWorld> = {}): TranslationRunWorld => ({
  status: 'ready',
  reason: null,
  draftId: 'w1',
  operationStatus: 'done',
  pauseReason: null,
  stepsDone: 7,
  stepsTotal: 7,
  flaggedItems: 0,
  failedItems: 0,
  spentUsd: '0.2',
  ...over,
});

const line = (
  w: TranslationRunWorld | null,
  status: 'running' | 'done' | 'failed' | 'cancelled' = 'done',
  analysis: Pick<TranslationRunAnalysis, 'status'> | null = { status: 'ready' }
) => worldLineOf(true, { status, world: w, analysis });

describe('Подпись мира языка запуска (F08-9b)', () => {
  it('без Write World строки нет', () => {
    expect(worldLineOf(false, { status: 'done', world: world(), analysis: null })).toBeNull();
  });

  it('мира ещё нет: язык идёт - ждёт перевода; упал - не начат; done без мира - без строки', () => {
    expect(line(null, 'running')?.text).toBe('World: waiting for translation');
    expect(line(null, 'failed')?.text).toBe('World: not started — translation failed');
    expect(line(null, 'done')).toBeNull();
  });

  it('pending: пока анализ языка не появился, ждёт старта или пишется - ждёт анализа; иначе - ждёт старта (решение арбитра F08 | F08-9b-2)', () => {
    const pending = world({ status: 'pending', stepsDone: 0, stepsTotal: null });
    const waiting = { text: 'World: waiting for the analysis', link: null };
    expect(line(pending, 'done', { status: 'building' })).toEqual(waiting);
    expect(line(pending, 'done', { status: 'pending' })).toEqual(waiting);
    expect(line(pending, 'done', null)).toEqual(waiting);
    expect(line(pending, 'done', { status: 'skipped' })).toEqual(waiting);
    expect(line(pending, 'done', { status: 'discarded' })).toEqual(waiting);
    expect(line(pending, 'done', { status: 'ready' })).toEqual({
      text: 'World: waiting to start',
      link: null,
    });
    expect(line(pending, 'done', { status: 'failed' })?.text).toBe('World: waiting to start');
    // Без Write World строки нет и при ожидании.
    expect(worldLineOf(false, { status: 'done', world: pending, analysis: null })).toBeNull();
  });

  it('WORLD_ANALYSIS_MISSING: не начат - анализ языка не готов (бэкенд отдаёт skipped)', () => {
    expect(line(world({ status: 'skipped', reason: 'WORLD_ANALYSIS_MISSING' }))).toEqual({
      text: 'World: not started — the analysis of this language is not ready',
      link: 'Write World on the World tab',
    });
    expect(line(world({ status: 'failed', reason: 'WORLD_ANALYSIS_MISSING' }))?.text).toBe(
      'World: failed — the analysis of this language is not ready'
    );
    expect(worldReasonText('WORLD_ANALYSIS_MISSING')).toBe(
      'the analysis of this language is not ready'
    );
  });

  it('ход: шаг после законченных; пауза - со ссылкой', () => {
    expect(line(world({ status: 'building', operationStatus: 'active', stepsDone: 2 }))?.text).toBe(
      'World: writing, step 3 of 7'
    );
    expect(
      line(world({ status: 'building', operationStatus: 'active', stepsTotal: null }))?.text
    ).toBe('World: writing');
    const paused = line(
      world({ status: 'building', operationStatus: 'paused', pauseReason: 'CEILING_REACHED' })
    );
    expect(paused?.text).toMatch(/^World: paused — /);
    expect(paused?.link).toBe('Open the World tab');
  });

  it('готов: done; с флагами модели - со ссылкой; с упавшими блоками - partly done', () => {
    expect(line(world())).toEqual({ text: 'World: done', link: null });
    expect(line(world({ flaggedItems: 2 }))).toEqual({
      text: 'World: done, blocks with model flags: 2',
      link: 'Open the World tab',
    });
    expect(line(world({ failedItems: 1 }))?.text).toBe('World: partly done — 1 block failed');
    expect(isWorldComplete(world({ failedItems: 1 }))).toBe(false);
  });

  it('пропуск автозапуска: существующий ход - ссылка на вкладку; иначе - писать на вкладке', () => {
    const existing = line(world({ status: 'skipped', reason: 'AUTOSTART_SKIPPED_EXISTING' }));
    expect(existing?.text).toBe(
      'World: not started — the version already has a finished world run'
    );
    expect(existing?.link).toBe('Open the World tab');
    expect(line(world({ status: 'skipped', reason: 'AUTOSTART_SKIPPED_LLM_DISABLED' }))?.link).toBe(
      'Write World on the World tab'
    );
  });

  it.each([
    ['AUTOSTART_SKIPPED_IN_PROGRESS', 'the world of this version is already being written'],
    ['AUTOSTART_NOTHING_TO_START', 'the autostart closed without starting the world'],
    ['AUTOSTART_FAILED', 'the start of the world failed'],
    ['AUTOSTART_CANCELLED', 'the start of the world was cancelled'],
  ])('код автозапуска %s - своей фразой', (code, text) => {
    expect(worldReasonText(code)).toBe(text);
  });

  it('отказ старта - фразой вкладки World; язык отменён до мира - не начат', () => {
    expect(line(world({ status: 'skipped', reason: 'WORLD_LANGUAGE_UNSUPPORTED' }))?.text).toBe(
      'World: not started — write World does not take versions in this language'
    );
    expect(line(null, 'cancelled')?.text).toBe('World: not started — translation cancelled');
    expect(line(world({ status: 'discarded' }))?.text).toBe('World: discarded on the World tab');
  });

  it('траты World по языкам; мира нет ни у одного - null', () => {
    expect(sumWorldSpent([{ world: world() }, { world: world({ spentUsd: '0.3' }) }])).toBe('0.5');
    expect(sumWorldSpent([{ world: null }, {}])).toBeNull();
  });
});
