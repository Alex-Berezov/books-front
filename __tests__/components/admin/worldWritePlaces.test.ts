import { describe, expect, it } from 'vitest';
import {
  itemTitle,
  leftOutText,
  placeValueText,
  placesOffText,
  progressText,
  reasonText,
  stepTitle,
  writeEstimateText,
} from '@/components/admin/books/WorldTab/WorldWrite/worldWrite.utils';
import type { WorldWrite } from '@/types/api-schema';
import { item, run as runFixture, step as stepFixture } from '../../fixtures/worldWrite';

/**
 * Места в ходе «Write World» на вкладке World (F08-12b): шаги мест после шагов пар (копия stepAt
 * бэкенда), подписи пропусков и отказа шага места, места в оценке.
 */
describe('worldWrite.utils places (F08-12b)', () => {
  const garret = { key: 'garret', name: 'The garret', aliases: ['garret'], chapters: [1, 2] };
  const pair = { key: 'anna--boris', a: 'anna', b: 'boris', linked: true, chapters: [1] };
  const run = (done: number, patch: Partial<WorldWrite> = {}): WorldWrite =>
    runFixture({
      status: 'building',
      candidates: [
        { key: 'anna', name: 'Anna', aliases: [], chapters: [1] },
        { key: 'boris', name: 'Boris', aliases: [], chapters: [1] },
      ],
      pairs: [pair],
      places: [garret, { ...garret, key: 'square', name: 'The square' }],
      stepsTotal: 8,
      steps: Array.from({ length: done }, (_, n) => stepFixture({ step: n })),
      items: [],
      ...patch,
    });

  it('the place steps go after the pair steps: step 7 and 8 are the places, numbered among the places', () => {
    expect(progressText(run(5))).toBe('Step 6 of 8: Pair: Anna and Boris (pair 1 of 1)…');
    expect(progressText(run(6))).toBe('Step 7 of 8: Place: The garret (place 1 of 2)…');
    expect(progressText(run(7))).toBe('Step 8 of 8: Place: The square (place 2 of 2)…');
  });

  it('a run without pairs: the place right after the heroes; a run without places keeps its numbers', () => {
    expect(progressText(run(5, { pairs: [], stepsTotal: 7 }))).toBe(
      'Step 6 of 7: Place: The garret (place 1 of 2)…'
    );
    expect(progressText(run(5, { places: [], stepsTotal: 6 }))).toBe(
      'Step 6 of 6: Pair: Anna and Boris (pair 1 of 1)…'
    );
  });

  it('a step and an item of a place are named by the place', () => {
    const r = run(0);
    expect(stepTitle(r, stepFixture({ step: 6, kind: 'place', key: 'garret' }))).toBe(
      'Place: The garret'
    );
    expect(itemTitle(r, item({ key: 'garret', block: 'significance' }))).toBe(
      'The garret: Significance'
    );
    // R3 (`F08 | F08-12b`): вид и номер Wikidata — один пункт `kind`.
    expect(itemTitle(r, item({ key: 'garret', block: 'kind' }))).toBe(
      'The garret: Real or fictional, Wikidata ID'
    );
    expect(itemTitle(r, item({ key: 'garret', block: 'location' }))).toBe('The garret: Location');
    expect(itemTitle(r, item({ key: 'garret', block: 'description' }))).toBe(
      'The garret: Description'
    );
    expect(reasonText('WORLD_PLACE_KEY_TAKEN')).toBe(
      'the key of the place is taken by an entity of another type'
    );
  });

  it('the kind of a place in words; no kind - nothing (the proposal clears the block)', () => {
    expect(placeValueText({ kind: 'real', wikidataId: 'Q656' })).toBe('real, Wikidata Q656');
    expect(placeValueText({ kind: 'real', wikidataId: null })).toBe('real, no Wikidata ID');
    expect(placeValueText({ kind: 'fictional', wikidataId: null })).toBe('fictional');
    expect(placeValueText({ kind: null, wikidataId: null })).toBeNull();
    expect(placeValueText(null)).toBeNull();
  });

  it('left out places: the name, the chapters and the reason', () => {
    const r = run(0);
    expect(
      leftOutText(r, {
        key: 'yard',
        reason: 'PLACE_BELOW_MIN_CHAPTERS',
        names: ['The yard'],
        chapters: 1,
      })
    ).toBe('The yard (1 chapter): a place in fewer than 2 chapters.');
    expect(
      leftOutText(r, {
        key: 'anna',
        reason: 'PLACE_KEY_TAKEN',
        names: ['Anna street'],
        chapters: null,
      })
    ).toBe('Anna street: the key of the place is taken by an entity of another type.');
    expect(leftOutText(r, { key: 'p11', reason: 'PLACES_MAX', names: ['P11'], chapters: 3 })).toBe(
      'P11 (3 chapters): over the limit of places per run.'
    );
  });

  it('no places for the language: the reason; places chosen or the choice not passed - nothing', () => {
    expect(placesOffText({ placesOff: 'WORLD_PLACE_LANGUAGE' })).toBe(
      'No places in this run: the language has no place sample yet.'
    );
    expect(placesOffText({ placesOff: null })).toBeNull();
  });

  it('the estimate names the places when there are any', () => {
    const base = {
      dossier: null,
      glossary: null,
      candidates: 2,
      pairs: 1,
      stageUsd: '0.5',
      upperBound: false,
      suggestedLimitUsd: '1',
    } as const;
    expect(writeEstimateText({ ...base, places: 4 })).toContain(
      'at most 1 character pair, at most 4 places, up to $0.5.'
    );
    expect(writeEstimateText({ ...base, places: 0 })).not.toContain('place');
  });
});
