import { describe, expect, it } from 'vitest';
import {
  entityName,
  leftOutText,
  objectsOffTexts,
  progressText,
  reasonText,
  stepTitle,
  writeEstimateText,
} from '@/components/admin/books/WorldTab/WorldWrite/worldWrite.utils';
import type { WorldWrite } from '@/types/api-schema';
import { run as runFixture, step as stepFixture } from '../../fixtures/worldWrite';

/**
 * События в ходе «Write World» на вкладке World (F08-13b-2, решения `F08 | F08-13b` Q2, Q3, Q6):
 * шаги событий после шагов понятий (копия stepAt бэкенда), имя события в шаге, подписи пропусков
 * выбора и отказа шага, причина выключения событий, события в оценке.
 */
describe('worldWrite.utils events (F08-13b-2)', () => {
  const pledge = { key: 'pledge', name: 'The pledge', aliases: [], chapters: [1, 2] };
  const murder = { key: 'the-murder', name: 'The murder', aliases: ['murder'], chapters: [7] };
  const run = (done: number, patch: Partial<WorldWrite> = {}): WorldWrite =>
    runFixture({
      status: 'building',
      candidates: [{ key: 'anna', name: 'Anna', aliases: [], chapters: [1] }],
      pairs: [],
      places: [],
      objects: [],
      terms: [pledge],
      events: [murder, { ...murder, key: 'confession', name: 'The confession' }],
      stepsTotal: 6,
      steps: Array.from({ length: done }, (_, n) => stepFixture({ step: n })),
      items: [],
      ...patch,
    });

  it('events go after terms, each numbered among the events', () => {
    expect(progressText(run(3))).toBe('Step 4 of 6: Term: The pledge (term 1 of 1)…');
    expect(progressText(run(4))).toBe('Step 5 of 6: Event: The murder (event 1 of 2)…');
    expect(progressText(run(5))).toBe('Step 6 of 6: Event: The confession (event 2 of 2)…');
  });

  it('a run started before events (no field) keeps its numbers', () => {
    const old = run(3, { stepsTotal: 4 });
    delete (old as Partial<WorldWrite>).events;
    expect(progressText(old)).toBe('Step 4 of 4: Term: The pledge (term 1 of 1)…');
  });

  it('an event step is named by the event', () => {
    const r = run(0);
    expect(stepTitle(r, stepFixture({ step: 4, kind: 'event', key: 'the-murder' }))).toBe(
      'Event: The murder'
    );
    expect(entityName(r, 'confession')).toBe('The confession');
  });

  it('every event skip reason of the choice step has its own words', () => {
    const r = run(0);
    const line = (reason: Parameters<typeof leftOutText>[1]['reason'], chapters: number | null) =>
      leftOutText(r, { key: 'k', reason, names: ['K'], chapters });
    expect(line('EVENT_NO_CHAPTER', null)).toBe(
      'K: the choice step named the event without any chapter of this version.'
    );
    expect(line('EVENT_KEY_TAKEN', null)).toBe(
      'K: the key of the event is taken by an entity or a candidate of another type (the key is shared by all languages and keeps its type in every one).'
    );
    expect(line('EVENT_KEY_INVALID', null)).toBe(
      'K: no valid key for the event: none from the world of other versions, and the name gives no Latin key.'
    );
    expect(line('EVENTS_MAX', 2)).toBe('K (2 chapters): over the limit of events per run.');
  });

  it('a failed event step names its reason', () => {
    expect(reasonText('WORLD_EVENT_NOT_FOUND')).toBe(
      'neither the name forms nor the choice step found the event in any chapter of the version'
    );
    expect(reasonText('WORLD_EVENT_KEY_TAKEN')).toBe(
      'the key of the event is taken by an entity of another type'
    );
  });

  it('a language without an event sample says so', () => {
    expect(
      objectsOffTexts({ objectsOff: null, termsOff: null, eventsOff: 'WORLD_EVENT_LANGUAGE' })
    ).toEqual(['No events in this run: the language has no event sample yet.']);
    expect(objectsOffTexts({ objectsOff: null, termsOff: null, eventsOff: null })).toEqual([]);
  });

  it('the estimate names events; zero events or no field is not named', () => {
    const base = {
      dossier: null,
      glossary: null,
      candidates: 2,
      pairs: 0,
      places: 0,
      objects: 0,
      terms: 1,
      stageUsd: '0.5',
      upperBound: false,
      suggestedLimitUsd: '1',
    } as const;
    expect(writeEstimateText({ ...base, events: 10 })).toContain(
      'at most 1 term, at most 10 events, up to $0.5.'
    );
    expect(writeEstimateText({ ...base, events: 0 })).not.toContain('event');
    // Окно выката: ответ бэкенда без поля.
    expect(writeEstimateText(base as never)).not.toContain('event');
  });
});
