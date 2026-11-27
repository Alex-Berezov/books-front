import { describe, expect, it } from 'vitest';
import {
  BOOK_WORLD_LIMITS,
  worldListFieldsOf,
  worldTextFieldsOf,
} from '@/lib/admin/book-world-blocks';
import { formFromWorldEntity } from '@/lib/admin/book-world-form-state';
import {
  analyzeBookWorldEntityImport,
  checkBookWorldImport,
  worldEntityRequestFromForm,
} from '@/lib/admin/book-world-validation';
import type { BookWorldEntity } from '@/types/api-schema';

/**
 * F08-13b: предмет, понятие и событие в импорте и карточке World — ручная копия перечней
 * `WORLD_BLOCKS_OF_TYPE` и `checkWorldTypeFields` бэкенда (books/src/modules/book-world).
 */

const QUOTE = { text: 'The axe.', chapter: 1, speakerKey: 'raskolnikov', interpretation: 'Fear.' };
const SCENE = { chapter: 7, title: 'The murder', text: 'He strikes.' };
const FAQ = [{ question: 'Whose axe?', answer: 'The porter.' }];

const ENTITIES = {
  object: {
    key: 'axe',
    type: 'object',
    name: 'The axe',
    aliases: ['the blade'],
    short: 'The weapon.',
    significance: 'The crime itself.',
    description: 'An axe under the coat.',
    quotes: [QUOTE],
    faq: FAQ,
    characterKeys: ['raskolnikov'],
    themeKeys: ['crime'],
  },
  term: {
    key: 'superman',
    type: 'term',
    name: 'Extraordinary man',
    short: 'The theory.',
    significance: 'Why he kills.',
    quotes: [QUOTE],
  },
  event: {
    key: 'murder',
    type: 'event',
    name: 'The murder',
    short: 'The crime.',
    significance: 'The turn of the novel.',
    scenes: [SCENE],
    quotes: [QUOTE],
    characterKeys: ['raskolnikov', 'alyona'],
  },
} as const;
type ObjectType = keyof typeof ENTITIES;
const TYPES = Object.keys(ENTITIES) as ObjectType[];

const entityOf = (type: ObjectType, patch: Record<string, unknown> = {}) => ({
  ...structuredClone(ENTITIES[type]),
  ...patch,
});
const world = (...entities: Record<string, unknown>[]) => ({ language: 'en', entities });
const issues = (input: unknown) =>
  checkBookWorldImport(structuredClone(input), 'en').errors.map((e) => `${e.path}: ${e.message}`);

describe('book world import of an object, a term and an event (F08-13b)', () => {
  it.each(TYPES)('%s passes the version import with its own fields, no unknown key', (type) => {
    const result = checkBookWorldImport(world(entityOf(type)), 'en');
    expect(result.errors).toEqual([]);
    expect(result.data?.entities[0]).toMatchObject(ENTITIES[type]);
  });

  it.each(TYPES)('%s passes the import of one entity: the key goes to the address', (type) => {
    const result = analyzeBookWorldEntityImport(
      JSON.stringify({ ...entityOf(type), language: 'en' }),
      'en',
      null
    );
    expect(result.errors).toEqual([]);
    expect(result.data?.key).toBe(ENTITIES[type].key);
    expect(result.data?.body).toMatchObject({ type, short: ENTITIES[type].short });
  });

  it('imageBrief, role and sources at an object are not a field of an object', () => {
    const input = world(
      entityOf('object', {
        imageBrief: 'A rusty axe.',
        role: 'main',
        sources: [{ title: 'W', url: 'https://w.org' }],
      })
    );
    expect(issues(input).sort()).toEqual([
      'entities.0.imageBrief: not a field of an object',
      'entities.0.role: not a field of an object',
      'entities.0.sources: not a field of an object',
    ]);
  });

  it('a term has no description, faq, scenes or links; an event has no description, faq or themes', () => {
    const term = entityOf('term', {
      description: 'x',
      faq: FAQ,
      scenes: [SCENE],
      characterKeys: ['sonya'],
    });
    expect(issues(world(term)).sort()).toEqual([
      'entities.0.characterKeys: not a field of a term',
      'entities.0.description: not a field of a term',
      'entities.0.faq: not a field of a term',
      'entities.0.scenes: not a field of a term',
    ]);
    const event = entityOf('event', { description: 'x', faq: FAQ, themeKeys: ['crime'] });
    expect(issues(world(event)).sort()).toEqual([
      'entities.0.description: not a field of an event',
      'entities.0.faq: not a field of an event',
      'entities.0.themeKeys: not a field of an event',
    ]);
  });

  it('hero, pair and place fields at an object are not its fields; empty ones are cleared', () => {
    const foreign = entityOf('object', { appearance: 'Rusty.', bonds: 'x', kind: 'real' });
    expect(issues(world(foreign)).sort()).toEqual([
      'entities.0.appearance: not a field of an object',
      'entities.0.bonds: not a field of an object',
      'entities.0.kind: not a field of an object',
    ]);
    const about = entityOf('object', { quotes: [{ ...QUOTE, aboutKey: 'sonya' }] });
    expect(issues(world(about))).toEqual([
      'entities.0.quotes.0.aboutKey: not a field of an object',
    ]);
    const empty = checkBookWorldImport(
      world(entityOf('term', { role: null, imageBrief: ' ', faq: [] })),
      'en'
    );
    expect(empty.errors).toEqual([]);
    expect(empty.data?.entities[0]).toMatchObject({ role: null, imageBrief: null, faq: null });
  });

  it('link limits are the backend copy: 10 characters, 8 themes', () => {
    // `BOOK_WORLD_LIMITS` бэкенда: characterKeys 10, themeKeys = BOOK_ANALYSIS_LIMITS.themeKeys (8).
    expect(BOOK_WORLD_LIMITS.characterKeys).toBe(10);
    expect(BOOK_WORLD_LIMITS.themeKeys).toBe(8);
  });

  it('links: keys by the key rule, no duplicates, up to the backend limits', () => {
    const keys = (n: number) => Array.from({ length: n }, (_, i) => `k${i}`);
    const object = (patch: Record<string, unknown>) => issues(world(entityOf('object', patch)));
    expect(object({ characterKeys: keys(BOOK_WORLD_LIMITS.characterKeys) })).toEqual([]);
    expect(object({ characterKeys: keys(BOOK_WORLD_LIMITS.characterKeys + 1) })).toHaveLength(1);
    expect(object({ themeKeys: keys(BOOK_WORLD_LIMITS.themeKeys) })).toEqual([]);
    expect(object({ themeKeys: keys(BOOK_WORLD_LIMITS.themeKeys + 1) })).toHaveLength(1);
    expect(object({ themeKeys: ['crime', 'crime'] })).toEqual([
      'entities.0.themeKeys: duplicate key',
    ]);
    const badKey = issues(world(entityOf('event', { characterKeys: ['Bad_Key'] })));
    expect(badKey.map((e) => e.split(':')[0])).toEqual(['entities.0.characterKeys.0']);
  });
});

describe('links at a character, a pair and a place (F08-13b)', () => {
  const others = [
    { key: 'raskolnikov', type: 'character', name: 'Raskolnikov' },
    { key: 'raskolnikov--sonya', type: 'pair', name: 'R and S' },
    { key: 'garret', type: 'place', name: 'The garret' },
  ];

  it.each(others)('$type: characterKeys null and themeKeys [] pass as cleared', (entity) => {
    const result = checkBookWorldImport(
      world({ ...entity, characterKeys: null, themeKeys: [] }),
      'en'
    );
    expect(result.errors).toEqual([]);
    expect(result.data?.entities[0]).toMatchObject({ characterKeys: null, themeKeys: null });
  });

  it.each(others)('$type: non-empty links are not its field', (entity) => {
    const input = world({ ...entity, characterKeys: ['sonya'], themeKeys: ['crime'] });
    expect(issues(input).sort()).toEqual([
      `entities.0.characterKeys: not a field of a ${entity.type}`,
      `entities.0.themeKeys: not a field of a ${entity.type}`,
    ]);
  });
});

describe('card body of an object, a term and an event (F08-13b)', () => {
  const saved = (type: ObjectType) =>
    ({
      ...entityOf(type),
      role: null,
      hasCore: false,
      isIndexable: true,
      updatedAt: '2026-11-27T00:00:00.000Z',
      createdAt: '2026-11-27T00:00:00.000Z',
      mentions: null,
    }) as unknown as BookWorldEntity;

  it.each(TYPES)('%s: the saved entity goes back through the form without hero fields', (type) => {
    const { key: _key, ...fields } = ENTITIES[type];
    const built = worldEntityRequestFromForm(formFromWorldEntity(saved(type)), 'en', type);
    expect(built.errors).toEqual([]);
    expect(built.data).toMatchObject(fields);
    for (const field of ['role', 'profile', 'arc', 'appearance', 'sources', 'imageBrief', 'kind']) {
      expect(built.data).not.toHaveProperty(field);
    }
  });

  it('the card fields of each type: a term has no description, faq, scenes or links', () => {
    expect(worldTextFieldsOf('term').map((f) => f.path)).toEqual(['short', 'significance']);
    expect(worldListFieldsOf('term').map((f) => f.path)).toEqual(['quotes']);
    expect(worldTextFieldsOf('object').map((f) => f.path)).toEqual([
      'short',
      'significance',
      'description',
    ]);
    expect(worldListFieldsOf('object').map((f) => f.path)).toEqual([
      'quotes',
      'faq',
      'characterKeys',
      'themeKeys',
    ]);
    expect(worldTextFieldsOf('event').map((f) => f.path)).toEqual(['short', 'significance']);
    expect(worldListFieldsOf('event').map((f) => f.path)).toEqual([
      'scenes',
      'quotes',
      'characterKeys',
    ]);
  });
});
