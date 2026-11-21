import { describe, expect, it, vi } from 'vitest';
import {
  itemTitle,
  coreMissingText,
  leftOutText,
  pairsOffText,
  progressText,
  reasonText,
  refusalText,
  stepTitle,
  writeEstimateText,
} from '@/components/admin/books/WorldTab/WorldWrite/worldWrite.utils';
import { ApiError } from '@/types/api';
import type { WorldWrite, WorldWriteEstimate, WorldWriteStep } from '@/types/api-schema';

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

  it('no candidate under the number: the step without a name (past the heroes - a pair step, as stepAt)', () => {
    // Нумерация как stepAt бэкенда (F08-8e): без героев номер 1 уже стоит после их шагов, это шаг пары.
    expect(progressText(run(1, { candidates: [] }))).toBe('Step 2 of 3: Pair…');
  });
});

describe('worldWrite.utils writeEstimateText (F08-8b)', () => {
  const estimate = (candidates: number): WorldWriteEstimate => ({
    dossier: null,
    glossary: null,
    candidates,
    pairs: 0,
    stageUsd: '0.5',
    upperBound: false,
    suggestedLimitUsd: '1',
  });

  it('names the number of characters as an upper bound of main and secondary ones', () => {
    expect(writeEstimateText(estimate(3))).toContain(
      'The world: at most 3 characters (main and secondary), up to $0.5.'
    );
  });

  it('one character - singular', () => {
    expect(writeEstimateText(estimate(1))).toContain('at most 1 character (main and secondary)');
  });
});

describe('worldWrite.utils pairs (F08-8e)', () => {
  const pairRun = (done: number, patch: Partial<WorldWrite> = {}): WorldWrite =>
    ({
      id: 'd1',
      status: 'building',
      waitingFor: null,
      operation: { id: 'op', status: 'active', pauseReason: null },
      // выбор + 3 героя по два шага + 2 пары
      stepsTotal: 9,
      candidates: [
        { key: 'anna', name: 'Anna', aliases: [], chapters: [1] },
        { key: 'boris', name: 'Boris', aliases: [], chapters: [1] },
        { key: 'clara', name: 'Clara', aliases: [], chapters: [3] },
      ],
      pairs: [
        { key: 'anna--boris', a: 'anna', b: 'boris', linked: true, chapters: [1, 2] },
        { key: 'anna--clara', a: 'anna', b: 'clara', linked: false, chapters: [3] },
      ],
      steps: Array.from({ length: done }, (_, n) => ({ step: n })),
      items: [],
      ...patch,
    }) as unknown as WorldWrite;

  it('steps after the heroes are counted as pair steps, with their own count', () => {
    // шаги героев: 1-6; пара 1 — шаг с номером 7 (done = 7 -> «Step 8»)
    expect(progressText(pairRun(6))).toBe('Step 7 of 9: External blocks: Clara…');
    expect(progressText(pairRun(7))).toBe('Step 8 of 9: Pair: Anna and Boris (pair 1 of 2)…');
    expect(progressText(pairRun(8))).toBe('Step 9 of 9: Pair: Anna and Clara (pair 2 of 2)…');
    expect(progressText(pairRun(9))).toBe('Step 9 of 9: finishing…');
  });

  it('a step number past the heroes with no pair under it is a pair step without a name (as stepAt)', () => {
    expect(progressText(pairRun(7, { pairs: [] }))).toBe('Step 8 of 9: Pair…');
    expect(progressText(pairRun(7, { pairs: null }))).toBe('Step 8 of 9: Pair…');
  });

  it('titles of the pair step and of its blocks name both heroes', () => {
    const run = pairRun(0);
    expect(stepTitle(run, { kind: 'pair', key: 'anna--boris' } as never)).toBe(
      'Pair: Anna and Boris'
    );
    expect(itemTitle(run, { key: 'anna--boris', block: 'compare' } as never)).toBe(
      'Anna and Boris: Comparison'
    );
    expect(itemTitle(run, { key: 'anna--boris', block: 'bonds' } as never)).toBe(
      'Anna and Boris: What links them'
    );
    expect(itemTitle(run, { key: 'anna', block: 'short' } as never)).toBe(
      'Anna: Short description'
    );
  });

  it('a hero key with "--" that is not a pair of the run stays a hero name (LEGACY-507)', () => {
    const run = pairRun(0, {
      candidates: [{ key: 'old--hero', name: 'Old Hero', aliases: [], chapters: [1] }],
      pairs: [],
    });
    expect(itemTitle(run, { key: 'old--hero', block: 'short' } as never)).toBe(
      'Old Hero: Short description'
    );
  });

  it('a pair step without a key (the pair is missing under its number) is a pair step, not the choice', () => {
    expect(stepTitle(pairRun(0), { kind: 'pair', key: null } as never)).toBe('Pair');
    expect(stepTitle(pairRun(0), { kind: 'page', key: null } as never)).toBe('Page');
    expect(stepTitle(pairRun(0), { kind: 'select', key: null } as never)).toBe(
      'Choice of characters and name forms'
    );
  });

  it('a pair member missing from the candidates: the key of the pair, not a half name', () => {
    const run = pairRun(0, {
      pairs: [{ key: 'anna--zed', a: 'anna', b: 'zed', linked: false, chapters: [1] }],
    });
    expect(stepTitle(run, { kind: 'pair', key: 'anna--zed' } as never)).toBe('Pair: anna--zed');
  });

  it('the estimate names the pairs only when there are some', () => {
    const base = {
      dossier: null,
      glossary: null,
      candidates: 3,
      stageUsd: '0.5',
      upperBound: false,
      suggestedLimitUsd: '1',
    } as const;
    expect(writeEstimateText({ ...base, pairs: 3 })).toContain(
      'at most 3 characters (main and secondary), at most 3 character pairs, up to $0.5.'
    );
    expect(writeEstimateText({ ...base, pairs: 1 })).toContain(', at most 1 character pair, up to');
    expect(writeEstimateText({ ...base, pairs: 0 })).not.toContain('pair');
  });

  it('left-out characters and pairs with the reason; no pairs without a sample', () => {
    const run = pairRun(0);
    expect(leftOutText(run, { key: 'x--y', reason: 'PAIRS_MAX', chapters: 3 })).toBe(
      'x--y (3 common chapters): over the limit of pairs per run.'
    );
    // Отсеянная пара героев хода — по именам героев, хотя в `pairs` её нет.
    expect(leftOutText(run, { key: 'boris--clara', reason: 'PAIRS_MAX', chapters: 1 })).toBe(
      'Boris and Clara (1 common chapter): over the limit of pairs per run.'
    );
    expect(pairsOffText({ pairsOff: 'WORLD_PAIR_LANGUAGE' })).toContain('no pair sample');
    expect(pairsOffText({ pairsOff: null })).toBeNull();
    // Ответ без поля (кэш до F08-8e) — тоже «пары не отключены».
    expect(pairsOffText({} as never)).toBeNull();
  });

  it.each([
    [
      'BELOW_MIN_CHAPTERS',
      'dan',
      1,
      'dan (1 chapter): a secondary character in fewer chapters than the threshold.',
    ],
    [
      'KEY_PAIR_FORM',
      'old--hero',
      null,
      'old--hero: the character key holds "--", reserved for pairs: the character is not written.',
    ],
    [
      'PAIR_KEY_INVALID',
      'anna--boris',
      2,
      'Anna and Boris (2 common chapters): no valid pair key for these two characters (too long, or "-" at the joint).',
    ],
    [
      'PAIR_KEY_TAKEN',
      'anna--clara',
      3,
      'Anna and Clara (3 common chapters): the pair key is taken by an entity of another type.',
    ],
    [
      'PAIRS_MAX',
      'boris--clara',
      1,
      'Boris and Clara (1 common chapter): over the limit of pairs per run.',
    ],
  ] as const)('left out %s: the full line', (reason, key, chapters, line) => {
    expect(leftOutText(pairRun(0, { pairs: [] }), { key, reason, chapters })).toBe(line);
  });

  it.each([
    ['WORLD_PAIR_MEMBER_MISSING', 'a character of the pair is not in the world of this version'],
    ['WORLD_PAIR_KEY_TAKEN', 'the key of the pair is taken by an entity of another type'],
    ['WORLD_PAIR_NOT_FOUNDED', 'the pair is not in enough common chapters to be created'],
    ['WORLD_MENTIONS_MOVED', 'the chapter text moved while the presence was recounted'],
  ])('pair step failure without a call %s is named', (code, text) => {
    expect(reasonText(code)).toBe(text);
  });
});

describe('worldWrite.utils coreMissingText (F08-8e)', () => {
  it('names the block and what to add', () => {
    expect(
      coreMissingText({
        code: 'CORE_MISSING',
        where: 'conclusion',
        note: 'Write the conclusion.',
        by: 'code',
      })
    ).toBe('The step left the core without Conclusion: Write the conclusion.');
  });
});
