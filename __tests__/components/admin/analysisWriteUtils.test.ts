import { describe, expect, it } from 'vitest';
import {
  blockChangedOf,
  isNothingToAdd,
  mayHaveWritten,
  progressText,
  skippedText,
  sortItems,
  startLossText,
} from '@/components/admin/books/AnalysisTab/AnalysisWrite/analysisWrite.utils';
import { ApiError } from '@/types/api';
import type { AnalysisWrite, AnalysisWriteItem, LlmOperation } from '@/types/api-schema';

/** F07-3a: правила хода анализа на вкладке — подписи, порядок, разбор отказов. */

const operation = (patch: Partial<LlmOperation> = {}): LlmOperation => ({
  id: 'op-1',
  kind: 'draft',
  status: 'active',
  pauseReason: null,
  bookVersionId: 'v1',
  limitUsd: '2',
  reservedUsd: '0',
  spentUsd: '0',
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z',
  ...patch,
});

const item = (patch: Partial<AnalysisWriteItem> = {}): AnalysisWriteItem => ({
  index: 0,
  target: 'mainIdea',
  step: 3,
  verdict: 'ok',
  remarks: [],
  review: null,
  outcome: 'proposed',
  failedReason: null,
  links: false,
  regenFailedReason: null,
  regenerating: false,
  regenOperationId: null,
  regenOperationStatus: null,
  regenPauseReason: null,
  ...patch,
});

const run = (patch: Partial<AnalysisWrite> = {}): AnalysisWrite => ({
  id: 'd1',
  bookVersionId: 'v1',
  status: 'building',
  language: 'en',
  failedReason: null,
  waitingFor: null,
  operation: operation(),
  stepsTotal: 5,
  owns: [],
  steps: [],
  items: [],
  droppedQuotes: [],
  droppedSources: [],
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z',
  ...patch,
});

const conflict = (code: string, data: Record<string, unknown> = {}, statusCode = 409) =>
  new ApiError({ statusCode, message: 'x', data: { code, ...data } });

describe('analysisWrite.utils', () => {
  it('progressText: the next step; all steps done — the last step, not «Step 6 of 5»', () => {
    const doneSteps = [1, 2, 3, 4, 5].map((step) => ({ step })) as AnalysisWrite['steps'];
    expect(progressText(run())).toBe('Step 1 of 5: Card and characters…');
    expect(progressText(run({ steps: doneSteps }))).toBe('Step 5 of 5: External facts…');
    expect(progressText(run({ stepsTotal: 3, steps: doneSteps.slice(0, 3) }))).toBe(
      'Step 3 of 3: Interpretations…'
    );
  });

  it('sortItems: by step, inside a step by index', () => {
    const sorted = sortItems([
      item({ index: 4, step: 5 }),
      item({ index: 2, step: 1 }),
      item({ index: 1, step: 1 }),
      item({ index: 0, step: 3 }),
    ]);
    expect(sorted.map((i) => i.index)).toEqual([1, 2, 0, 4]);
  });

  it('mayHaveWritten: a 409 refusal wrote nothing; BLOCK_CHANGED, network and 5xx — reload', () => {
    expect(mayHaveWritten(conflict('ANALYSIS_WRITE_REFUSED'))).toBe(false);
    expect(mayHaveWritten(conflict('ANALYSIS_ITEM_NOT_PROPOSED'))).toBe(false);
    expect(mayHaveWritten(conflict('ANALYSIS_BLOCK_CHANGED'))).toBe(true);
    expect(mayHaveWritten(conflict('X', {}, 502))).toBe(true);
    expect(mayHaveWritten(new Error('Failed to fetch'))).toBe(true);
  });

  it('blockChangedOf: the body of ANALYSIS_BLOCK_CHANGED only', () => {
    expect(blockChangedOf(conflict('ANALYSIS_BLOCK_CHANGED', { current: 'Now' }))).toMatchObject({
      code: 'ANALYSIS_BLOCK_CHANGED',
      current: 'Now',
    });
    expect(blockChangedOf(conflict('ANALYSIS_WRITE_REFUSED'))).toBeNull();
    expect(blockChangedOf(new Error('x'))).toBeNull();
  });

  it('startLossText: what a new start discards over a ready run; nothing — empty', () => {
    expect(startLossText(null)).toBe('');
    expect(startLossText(run({ items: [item()] }))).toBe('');
    expect(
      startLossText(
        run({
          status: 'ready',
          items: [
            item(),
            item({ index: 1 }),
            item({ index: 2, outcome: 'written', regenerating: true }),
          ],
        })
      )
    ).toBe(
      'This replaces the current run: 2 proposals not accepted will be discarded, 1 regeneration will be cancelled.'
    );
  });

  it('skippedText: the title and the reason; an unknown index — «Block N»', () => {
    expect(skippedText({ index: 3, code: 'ANALYSIS_REGEN_IN_PROGRESS' }, item())).toBe(
      'Main idea: the block is being regenerated.'
    );
    expect(skippedText({ index: 7, code: 'ANALYSIS_BLOCK_CHANGED' }, undefined)).toBe(
      'Block 7: the editor changed the block: press Accept to see what the block holds now, or Discard.'
    );
  });

  it('isNothingToAdd: none without a reason and not failed', () => {
    expect(isNothingToAdd(item({ outcome: 'none' }))).toBe(true);
    expect(isNothingToAdd(item({ outcome: 'none', failedReason: 'IMPORT_INVALID' }))).toBe(false);
    expect(isNothingToAdd(item({ outcome: 'none', verdict: 'failed' }))).toBe(false);
    expect(isNothingToAdd(item({ outcome: 'written' }))).toBe(false);
  });
});
