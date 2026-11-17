import { describe, expect, it, vi } from 'vitest';
import {
  progressText,
  refusalText,
} from '@/components/admin/books/WorldTab/WorldWrite/worldWrite.utils';
import { ApiError } from '@/types/api';
import type { WorldWrite, WorldWriteStep } from '@/types/api-schema';

/** F08-4b: подписи отказов хода мира — только свои коды таблицы, прочее — общей подписью ходов. */

// Общая подпись ходов подменена меткой: видно, что чужой код ушёл к ней, а не взят из прототипа таблицы.
vi.mock('@/components/admin/books/ContentDraft/contentDraft.utils', async (importActual) => ({
  ...(await importActual<object>()),
  refusalText: () => 'common refusal',
}));

const conflict = (code: string, data: object = {}) =>
  new ApiError({ statusCode: 409, message: 'refused', data: { code, ...data } });

describe('worldWrite.utils refusalText', () => {
  it('own codes in words', () => {
    expect(refusalText(conflict('WORLD_ITEM_NOT_REGENERABLE'))).toBe(
      'Name forms are not regenerated on their own: they come from the choice of characters.'
    );
    expect(
      refusalText(conflict('WORLD_WRITE_REFUSED', { errors: ['quotes.0: not verbatim'] }))
    ).toBe('The world import refused this block: quotes.0: not verbatim.');
  });

  it.each(['toString', 'constructor', 'hasOwnProperty'])(
    'a code named like a property of Object (%s) is not a caption: the common refusal text',
    (code) => {
      expect(refusalText(conflict(code))).toBe('common refusal');
    }
  );
});

describe('worldWrite.utils progressText', () => {
  const step = (n: number): WorldWriteStep => ({
    step: n,
    kind: n === 0 ? 'select' : n % 2 === 1 ? 'page' : 'external',
    key: n === 0 ? null : 'anna',
    verdict: 'ok',
    remarks: [],
    attempt: 1,
    outcome: 'done',
    failedReason: null,
    authorModel: null,
    review: null,
    source: null,
    dropped: [],
  });
  const run = (done: number, patch: Partial<WorldWrite> = {}): WorldWrite =>
    ({
      id: 'd1',
      status: 'building',
      waitingFor: null,
      operation: { id: 'op', status: 'active', pauseReason: null },
      stepsTotal: 3,
      candidates: [{ key: 'anna', name: 'Anna', aliases: [], chapters: [1] }],
      steps: Array.from({ length: done }, (_, n) => step(n)),
      items: [],
      ...patch,
    }) as unknown as WorldWrite;

  it('the characters are not chosen yet (stepsTotal null): step 1, the choice', () => {
    expect(progressText(run(0, { stepsTotal: null, candidates: null }))).toBe(
      'Step 1: choosing the characters and name forms…'
    );
    expect(progressText(run(1, { stepsTotal: null }))).toBe(
      'Step 1: choosing the characters and name forms…'
    );
  });

  it('the page and the external blocks of the character by the step count', () => {
    expect(progressText(run(1))).toBe('Step 2 of 3: Page: Anna…');
    expect(progressText(run(2))).toBe('Step 3 of 3: External blocks: Anna…');
  });

  it('all steps passed or more than counted: finishing, no step beyond the count', () => {
    expect(progressText(run(3))).toBe('Step 3 of 3: finishing…');
    expect(progressText(run(5))).toBe('Step 3 of 3: finishing…');
  });

  it('no candidate under the number: the step without a name', () => {
    expect(progressText(run(1, { candidates: [] }))).toBe('Step 2 of 3: Page…');
  });
});
