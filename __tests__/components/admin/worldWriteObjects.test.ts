import { describe, expect, it } from 'vitest';
import {
  itemTitle,
  leftOutText,
  objectsOffTexts,
  progressText,
  reasonText,
  stepTitle,
  writeEstimateText,
} from '@/components/admin/books/WorldTab/WorldWrite/worldWrite.utils';
import type { WorldWrite } from '@/types/api-schema';
import { item, run as runFixture, step as stepFixture } from '../../fixtures/worldWrite';

/**
 * Предметы и понятия в ходе «Write World» на вкладке World (F08-13b-1, решения `F08 | F08-13b` Q1, Q6):
 * шаги предметов после шагов мест, понятий — после предметов (копия stepAt бэкенда), подписи пропусков
 * и отказа шага, причина выключения типа, предметы и понятия в оценке.
 */
describe('worldWrite.utils objects and terms (F08-13b)', () => {
  const garret = { key: 'garret', name: 'The garret', aliases: [], chapters: [1, 2] };
  const axe = { key: 'axe', name: 'The axe', aliases: ['axe'], chapters: [1] };
  const pledge = { key: 'pledge', name: 'The pledge', aliases: [], chapters: [1, 2] };
  const run = (done: number, patch: Partial<WorldWrite> = {}): WorldWrite =>
    runFixture({
      status: 'building',
      candidates: [{ key: 'anna', name: 'Anna', aliases: [], chapters: [1] }],
      pairs: [],
      places: [garret],
      objects: [axe, { ...axe, key: 'bell', name: 'The bell' }],
      terms: [pledge],
      stepsTotal: 7,
      steps: Array.from({ length: done }, (_, n) => stepFixture({ step: n })),
      items: [],
      ...patch,
    });

  it('objects go after places and terms after objects, each numbered among its own type', () => {
    expect(progressText(run(3))).toBe('Step 4 of 7: Place: The garret (place 1 of 1)…');
    expect(progressText(run(4))).toBe('Step 5 of 7: Object: The axe (object 1 of 2)…');
    expect(progressText(run(5))).toBe('Step 6 of 7: Object: The bell (object 2 of 2)…');
    expect(progressText(run(6))).toBe('Step 7 of 7: Term: The pledge (term 1 of 1)…');
  });

  it('a run without places starts objects right after the heroes; a run without new types keeps its numbers', () => {
    expect(progressText(run(3, { places: [], stepsTotal: 6 }))).toBe(
      'Step 4 of 6: Object: The axe (object 1 of 2)…'
    );
    expect(progressText(run(3, { objects: [], terms: [], stepsTotal: 4 }))).toBe(
      'Step 4 of 4: Place: The garret (place 1 of 1)…'
    );
  });

  it('a step number over all lists is no place: a nameless step, not «Place»', () => {
    // Счёт хода разошёлся со списками: шагов больше, чем сущностей.
    expect(progressText(run(7, { stepsTotal: 9 }))).toBe('Step 8 of 9: Step…');
  });

  it('a step and an item of an object or a term are named by the entity', () => {
    const r = run(0);
    expect(stepTitle(r, stepFixture({ step: 4, kind: 'object', key: 'axe' }))).toBe(
      'Object: The axe'
    );
    expect(stepTitle(r, stepFixture({ step: 6, kind: 'term', key: 'pledge' }))).toBe(
      'Term: The pledge'
    );
    expect(itemTitle(r, item({ key: 'axe', block: 'characterKeys' }))).toBe(
      'The axe: Linked characters'
    );
    expect(itemTitle(r, item({ key: 'axe', block: 'themeKeys' }))).toBe('The axe: Linked themes');
    expect(itemTitle(r, item({ key: 'pledge', block: 'significance' }))).toBe(
      'The pledge: Significance'
    );
  });

  it('the skips of objects, terms and organizations are worded', () => {
    const r = run(0);
    expect(
      leftOutText(r, {
        key: 'knife',
        reason: 'OBJECT_BELOW_MIN_CHAPTERS',
        names: ['The knife'],
        chapters: 0,
      })
    ).toBe('The knife (0 chapters): the name forms found the object in no chapter.');
    expect(
      leftOutText(r, { key: 'garret', reason: 'TERM_KEY_TAKEN', names: ['Garret'], chapters: null })
    ).toBe(
      'Garret: the key of the term is taken by an entity or a candidate of another type (a place or an object of the dossier counts too: the dossier is shared by all languages, the key keeps its type in every one).'
    );
    expect(
      leftOutText(r, {
        key: 'police',
        reason: 'ORGANIZATION_SKIPPED',
        names: ['The police'],
        chapters: null,
      })
    ).toBe('The police: an organization of the dossier: the world has no page type for it.');
    expect(leftOutText(r, { key: 'x', reason: 'OBJECTS_MAX', names: ['X'], chapters: 1 })).toBe(
      'X (1 chapter): over the limit of objects per run.'
    );
  });

  it('every object and term skip reason has its own words', () => {
    const r = run(0);
    const line = (reason: Parameters<typeof leftOutText>[1]['reason']) =>
      leftOutText(r, { key: 'k', reason, names: ['K'], chapters: null });
    expect(line('OBJECT_KEY_TAKEN')).toBe(
      'K: the key of the object is taken by an entity or a candidate of another type (a place of the dossier counts too: the dossier is shared by all languages, the key keeps its type in every one).'
    );
    expect(line('TERM_BELOW_MIN_CHAPTERS')).toBe('K: the name forms found the term in no chapter.');
    expect(line('TERMS_MAX')).toBe('K: over the limit of terms per run.');
  });

  it('an event step is titled by its kind; an unknown off code is shown as is', () => {
    expect(stepTitle(run(0), stepFixture({ step: 8, kind: 'event', key: null }))).toBe('Event');
    expect(objectsOffTexts({ objectsOff: 'WORLD_OBJECT_NEW' as never, termsOff: null })).toEqual([
      'WORLD_OBJECT_NEW',
    ]);
  });

  it('a failed step of an object or a term names its reason', () => {
    expect(reasonText('WORLD_OBJECT_NOT_FOUND')).toBe(
      'the name forms found the object in no chapter'
    );
    expect(reasonText('WORLD_STEP_OUT_OF_RUN')).toBe(
      'the step number is past every list of the run: the run data does not match its count'
    );
    expect(reasonText('WORLD_TERM_KEY_TAKEN')).toBe(
      'the key of the term is taken by an entity of another type'
    );
  });

  it('a language without an object or a term sample says so; none when both are written', () => {
    expect(
      objectsOffTexts({ objectsOff: 'WORLD_OBJECT_LANGUAGE', termsOff: 'WORLD_TERM_LANGUAGE' })
    ).toEqual([
      'No objects in this run: the language has no object sample yet.',
      'No terms in this run: the language has no term sample yet.',
    ]);
    expect(objectsOffTexts({ objectsOff: null, termsOff: null })).toEqual([]);
    // Ход до F08-13b: полей нет.
    expect(objectsOffTexts({})).toEqual([]);
  });

  it('the estimate names objects and terms; zero of a type is not named', () => {
    const base = {
      dossier: null,
      glossary: null,
      candidates: 2,
      pairs: 0,
      places: 0,
      events: 0,
      stageUsd: '0.5',
      upperBound: false,
      suggestedLimitUsd: '1',
    } as const;
    expect(writeEstimateText({ ...base, objects: 3, terms: 1 })).toContain(
      'at most 3 objects, at most 1 term, up to $0.5.'
    );
    const none = writeEstimateText({ ...base, objects: 0, terms: 0 });
    expect(none).not.toContain('object');
    expect(none).not.toContain('term');
  });
});
