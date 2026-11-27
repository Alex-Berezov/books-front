import { describe, expect, it } from 'vitest';
import { BOOK_WORLD_LIMITS } from '@/lib/admin/book-world-blocks';
import { formFromWorldEntity } from '@/lib/admin/book-world-form-state';
import {
  buildWorldPromptInputsText,
  promptDossierFromStatus,
} from '@/lib/admin/book-world-prompt-inputs';
import {
  analyzeBookWorldEntityImport,
  analyzeBookWorldImport,
  checkBookWorldImport,
  parseChapterExclusions,
  worldEntityRequestFromForm,
} from '@/lib/admin/book-world-validation';
import type { BookWorldEntity, DossierStatus } from '@/types/api-schema';
import en from '../../fixtures/example-world.en.json';
import es from '../../fixtures/example-world.es.json';
import fr from '../../fixtures/example-world.fr.json';
import pt from '../../fixtures/example-world.pt.json';
import ru from '../../fixtures/example-world.ru.json';

/**
 * F08-1: импорт мира книги в админке (`product.md` §17 п.4, техбриф `F08-1` §3-§4).
 * Эталон — побайтовая копия `books-app-docs/features/F08-book-wiki/prompts/example-world.*.json`.
 */

const issues = (input: unknown, lang = 'en') =>
  checkBookWorldImport(structuredClone(input), lang).errors.map((e) => `${e.path}: ${e.message}`);

const paths = (input: unknown, lang = 'en') =>
  checkBookWorldImport(structuredClone(input), lang).errors.map((e) => e.path);

type Example = { language: string; entities: Record<string, unknown>[] };

/** Первая сущность эталона с подменой. */
const spoilt = (patch: (entity: Record<string, unknown>) => void): Example => {
  const copy = structuredClone(en) as Example;
  patch(copy.entities[0]);
  return copy;
};

describe('book world import (F08-1)', () => {
  it.each([
    ['en', en],
    ['ru', ru],
    ['es', es],
    ['fr', fr],
    ['pt', pt],
  ])('the reference example %s passes the check as is', (lang, example) => {
    const result = checkBookWorldImport(structuredClone(example), lang);
    expect(result.errors).toEqual([]);
    expect(result.data?.entities.length).toBe((example as Example).entities.length);
  });

  // F08-11d-2: ТЗ на иллюстрацию - поле героя (решение `F08 | F08-11d` Q3), предел - как на бэкенде.
  it('the illustration brief: the reference example carries it; over the limit - an error on its path', () => {
    expect((en as Example).entities.every((e) => typeof e.imageBrief === 'string')).toBe(true);
    const at = spoilt((e) => {
      e.imageBrief = 'x'.repeat(BOOK_WORLD_LIMITS.imageBrief);
    });
    expect(paths(at)).toEqual([]);
    const over = spoilt((e) => {
      e.imageBrief = 'x'.repeat(BOOK_WORLD_LIMITS.imageBrief + 1);
    });
    expect(paths(over)).toEqual(['entities.0.imageBrief']);
  });

  // Решение `F08 | F08-11d-2` (импорт): ТЗ принимается у героя любой роли и без «Внешности» и уходит в тело.
  it('the illustration brief reaches the request body for any role, with or without appearance', () => {
    const input = spoilt((e) => {
      e.role = 'minor';
      e.appearance = null;
      e.imageBrief = '  Square 1:1 portrait.  ';
    });
    const result = checkBookWorldImport(structuredClone(input), 'en');
    expect(result.errors).toEqual([]);
    expect(result.data?.entities[0]).toMatchObject({
      role: 'minor',
      imageBrief: 'Square 1:1 portrait.',
    });
  });

  it('13 quotes: the error is on the quotes list path', () => {
    const input = spoilt((e) => {
      const quotes = e.quotes as unknown[];
      while (quotes.length < 13) quotes.push(structuredClone(quotes[0]));
    });
    expect(paths(input)).toEqual(['entities.0.quotes']);
  });

  it('a quote of 501 characters: the error is on the quote text path', () => {
    const input = spoilt((e) => {
      (e.quotes as { text: string }[])[3].text = 'x'.repeat(501);
    });
    expect(paths(input)).toEqual(['entities.0.quotes.3.text']);
  });

  it('an unknown field key: the error names the key by its path', () => {
    const input = spoilt((e) => {
      e.biography = 'x';
      (e.profile as Record<string, unknown>).age = 20;
    });
    expect(issues(input).sort()).toEqual([
      'entities.0.biography: unknown key',
      'entities.0.profile.age: unknown key',
    ]);
  });

  // F08-12b: тип места принимается; поля героя у него - поля чужого типа (как `checkWorldTypeFields`).
  it("type 'place' on a character entity: the hero fields are refused as not a field of a place", () => {
    const errors = issues(spoilt((e) => (e.type = 'place')));
    expect(errors).toContain('entities.0.role: not a field of a place');
    expect(errors).toContain('entities.0.appearance: not a field of a place');
    expect(errors.some((e) => e.endsWith('unknown key'))).toBe(false);
  });

  // F08-13b: тип предмета принимается (F08-13a); поля героя у него - поля чужого типа, не unknown key.
  it("type 'object' on a character entity: the hero fields are not a field of an object", () => {
    const errors = issues(spoilt((e) => (e.type = 'object')));
    expect(errors).toContain('entities.0.role: not a field of an object');
    expect(errors).toContain('entities.0.imageBrief: not a field of an object');
    expect(errors.some((e) => e.endsWith('unknown key') || e.startsWith('entities.0.type'))).toBe(
      false
    );
  });

  it('an unknown type is refused by its path', () => {
    expect(paths(spoilt((e) => (e.type = 'organization')))).toEqual(['entities.0.type']);
  });

  it('key A_b is refused by its path', () => {
    expect(paths(spoilt((e) => (e.key = 'A_b')))).toEqual(['entities.0.key']);
  });

  it('a duplicate key in the body is refused by its path', () => {
    const input = structuredClone(en) as Example;
    input.entities.push({ key: input.entities[0].key as string, type: 'character', name: 'X' });
    expect(paths(input)).toEqual([`entities.${input.entities.length - 1}.key`]);
  });

  it('JSON language other than the version: refused, nothing to import', () => {
    expect(paths(en, 'ru')).toEqual(['language']);
    expect(analyzeBookWorldImport(JSON.stringify(ru), 'en').data).toBeNull();
  });

  it('invalid JSON text is an error, not an exception', () => {
    expect(analyzeBookWorldImport('{', 'en').errors).toEqual([
      { path: '', message: 'invalid JSON' },
    ]);
  });

  it('a field missing from an entity stays missing in the body (the server keeps it), null clears', () => {
    const result = checkBookWorldImport(
      { language: 'en', entities: [{ key: 'a', type: 'character', quotes: null }] },
      'en'
    );
    expect(result.errors).toEqual([]);
    const entity = result.data!.entities[0];
    expect(entity).not.toHaveProperty('short');
    expect(entity.quotes).toBeNull();
  });
});

// F08-10a, решение арбитра `F08 | F08-10a` Q2: номер абзаца сцены с 1, как `@Min(1)` бэкенда.
describe('scene paragraph bound (F08-10a)', () => {
  const withParagraph = (paragraph: unknown) =>
    spoilt((e) => {
      e.scenes = [{ chapter: 1, title: 'T', text: 'S', paragraph }];
    });

  it('0 is refused, 1 and null pass', () => {
    expect(paths(withParagraph(0))).toEqual(['entities.0.scenes.0.paragraph']);
    expect(paths(withParagraph(1))).toEqual([]);
    expect(paths(withParagraph(null))).toEqual([]);
  });
});

describe('book world import of one entity (F08-1)', () => {
  const one = (patch: Record<string, unknown> = {}) =>
    JSON.stringify({ ...structuredClone(en.entities[0]), language: 'en', ...patch });

  it('an entity of the reference example passes; the key goes to the address, not the body', () => {
    const result = analyzeBookWorldEntityImport(one(), 'en', null);
    expect(result.errors).toEqual([]);
    expect(result.data?.key).toBe('raskolnikov');
    expect(result.data?.body).not.toHaveProperty('key');
  });

  it('a saved card keeps its key: the same key or none passes, another one is refused', () => {
    expect(analyzeBookWorldEntityImport(one(), 'en', 'raskolnikov').data?.key).toBe('raskolnikov');
    expect(
      analyzeBookWorldEntityImport(one({ key: undefined }), 'en', 'raskolnikov').data?.key
    ).toBe('raskolnikov');
    expect(analyzeBookWorldEntityImport(one(), 'en', 'sonya').errors.map((e) => e.path)).toEqual([
      'key',
    ]);
  });

  it('a new card without a key in the JSON, another language, form errors — by path', () => {
    expect(
      analyzeBookWorldEntityImport(one({ key: undefined }), 'en', null).errors.map((e) => e.path)
    ).toEqual(['key']);
    expect(analyzeBookWorldEntityImport(one(), 'ru', null).errors.map((e) => e.path)).toEqual([
      'language',
    ]);
    expect(
      analyzeBookWorldEntityImport(one({ type: 'organization' }), 'en', null).errors.map(
        (e) => e.path
      )
    ).toEqual(['type']);
  });
});

// F08-12b (решения арбитра `F08 | F08-12a` R5, `F08 | F08-12b` Q2): место - копия правила бэкенда
// (`WORLD_BLOCKS_OF_TYPE`, `checkWorldTypeFields`).
describe('book world import of a place (F08-12b)', () => {
  const QUOTE = {
    text: 'A cupboard.',
    chapter: 1,
    speakerKey: 'raskolnikov',
    interpretation: 'Poverty.',
  };
  const place = (patch: Record<string, unknown> = {}): Record<string, unknown> => ({
    key: 'garret',
    type: 'place',
    name: 'The garret',
    aliases: ['the room'],
    short: 'A tiny room under the roof.',
    kind: 'real',
    wikidataId: 'Q656',
    location: 'St Petersburg, near the Haymarket',
    significance: 'The hero plans the murder here.',
    description: 'A low closet under the roof with yellow wallpaper.',
    scenes: [{ chapter: 1, title: 'The plan', text: 'He lies and thinks.' }],
    quotes: [QUOTE],
    faq: [{ question: 'Where is it?', answer: 'Under the roof.' }],
    imageBrief: 'Wide 16:9 view of a garret, at least 1200x675 px.',
    ...patch,
  });
  const world = (...entities: Record<string, unknown>[]) => ({ language: 'en', entities });
  const placeIssues = (patch: Record<string, unknown>) => issues(world(place(patch)));

  it('a place passes the version import and keeps its fields', () => {
    const result = checkBookWorldImport(world(place()), 'en');
    expect(result.errors).toEqual([]);
    expect(result.data?.entities[0]).toMatchObject({
      type: 'place',
      kind: 'real',
      wikidataId: 'Q656',
      location: 'St Petersburg, near the Haymarket',
      imageBrief: 'Wide 16:9 view of a garret, at least 1200x675 px.',
    });
  });

  it('a place passes the import of one entity: the key goes to the address', () => {
    const result = analyzeBookWorldEntityImport(
      JSON.stringify({ ...place(), language: 'en' }),
      'en',
      null
    );
    expect(result.errors).toEqual([]);
    expect(result.data?.key).toBe('garret');
    expect(result.data?.body).toMatchObject({
      type: 'place',
      description: 'A low closet under the roof with yellow wallpaper.',
    });
  });

  it('a non-empty hero or pair field at a place is not a field of a place; empty is cleared', () => {
    expect(
      placeIssues({
        appearance: 'Tall.',
        role: 'main',
        sources: [{ title: 'W', url: 'https://w.org' }],
      }).sort()
    ).toEqual([
      'entities.0.appearance: not a field of a place',
      'entities.0.role: not a field of a place',
      'entities.0.sources: not a field of a place',
    ]);
    expect(placeIssues({ bonds: 'x' })).toEqual(['entities.0.bonds: not a field of a place']);
    expect(placeIssues({ quotes: [{ ...QUOTE, aboutKey: 'sonya' }] })).toEqual([
      'entities.0.quotes.0.aboutKey: not a field of a place',
    ]);
    const empty = checkBookWorldImport(world(place({ appearance: ' ', role: null })), 'en');
    expect(empty.errors).toEqual([]);
    expect(empty.data?.entities[0]).toMatchObject({ appearance: null, role: null });
  });

  it('an unknown key at a place is an unknown key by its path', () => {
    expect(placeIssues({ coordinates: [59.9, 30.3] })).toEqual([
      'entities.0.coordinates: unknown key',
    ]);
  });

  it('wikidataId only at a real place; without kind in the body the server decides', () => {
    const onlyReal = 'entities.0.wikidataId: wikidataId is only for a real place (kind: real)';
    expect(placeIssues({ kind: 'fictional' })).toEqual([onlyReal]);
    expect(placeIssues({ kind: null })).toEqual([onlyReal]);
    expect(placeIssues({ kind: 'fictional', wikidataId: null })).toEqual([]);
    expect(placeIssues({ kind: undefined })).toEqual([]);
    expect(placeIssues({ wikidataId: '90' })).toEqual([
      'entities.0.wikidataId: must be a Wikidata item ID, e.g. Q90',
    ]);
    expect(placeIssues({ kind: 'castle' }).map((e) => e.split(':')[0])).toEqual([
      'entities.0.kind',
    ]);
  });

  it('wikidataId: up to 16 characters - a longer one is refused by the same rule', () => {
    const at = `Q${'1'.repeat(15)}`;
    expect(at).toHaveLength(16);
    expect(placeIssues({ wikidataId: at })).toEqual([]);
    expect(placeIssues({ wikidataId: `${at}1` })).toEqual([
      'entities.0.wikidataId: must be a Wikidata item ID, e.g. Q90',
    ]);
  });

  it.each([
    ['location', BOOK_WORLD_LIMITS.location],
    ['significance', BOOK_WORLD_LIMITS.significance],
    ['description', BOOK_WORLD_LIMITS.description],
  ] as const)('%s: up to its limit passes, one character over is refused', (field, max) => {
    expect(placeIssues({ [field]: 'a'.repeat(max) })).toEqual([]);
    expect(placeIssues({ [field]: 'a'.repeat(max + 1) }).map((e) => e.split(':')[0])).toEqual([
      `entities.0.${field}`,
    ]);
  });

  it('kind "" is empty: kept as null, and wikidataId with it is refused', () => {
    const empty = checkBookWorldImport(world(place({ kind: '', wikidataId: null })), 'en');
    expect(empty.errors).toEqual([]);
    expect(empty.data?.entities[0]).toMatchObject({ kind: null, wikidataId: null });
    expect(placeIssues({ kind: '' })).toEqual([
      'entities.0.wikidataId: wikidataId is only for a real place (kind: real)',
    ]);
  });

  it('imageBrief is a field of a place, of a pair it is not', () => {
    expect(placeIssues({})).toEqual([]);
    expect(
      issues(world({ key: 'raskolnikov--sonya', type: 'pair', name: 'R and S', imageBrief: 'x' }))
    ).toEqual(['entities.0.imageBrief: not a field of a pair']);
  });

  it('place fields at a character or a pair are not their fields', () => {
    expect(issues(spoilt((e) => (e.kind = 'real')))).toEqual([
      'entities.0.kind: not a field of a character',
    ]);
    expect(
      issues(world({ key: 'raskolnikov--sonya', type: 'pair', name: 'R and S', location: 'x' }))
    ).toEqual(['entities.0.location: not a field of a pair']);
  });

  it('the place card form goes back through the body; a fictional place clears wikidataId', () => {
    const entity = {
      ...(place() as unknown as BookWorldEntity),
      role: null,
      hasCore: false,
      isIndexable: true,
      updatedAt: '2026-11-25T00:00:00.000Z',
      createdAt: '2026-11-25T00:00:00.000Z',
      mentions: null,
    };
    const form = formFromWorldEntity(entity);
    const built = worldEntityRequestFromForm(form, 'en', 'place');
    expect(built.errors).toEqual([]);
    expect(built.data).toMatchObject({
      type: 'place',
      kind: 'real',
      wikidataId: 'Q656',
      description: 'A low closet under the roof with yellow wallpaper.',
      aliases: ['the room'],
    });
    expect(built.data).not.toHaveProperty('role');
    expect(built.data).not.toHaveProperty('appearance');
    const fictional = worldEntityRequestFromForm({ ...form, kind: 'fictional' }, 'en', 'place');
    expect(fictional.errors).toEqual([]);
    expect(fictional.data).toMatchObject({ kind: 'fictional', wikidataId: null });
  });
});

describe('aliasExclusions (F08-2)', () => {
  it('the import takes excluded name forms; an empty one is refused', () => {
    const withExclusions = (aliasExclusions: string[]) => {
      const body = structuredClone(en);
      return { ...body, entities: [{ ...body.entities[0], aliasExclusions }] };
    };
    expect(checkBookWorldImport(withExclusions(['Rodya']), 'en').errors).toEqual([]);
    expect(checkBookWorldImport(withExclusions([' ']), 'en').errors.map((e) => e.path)).toEqual([
      'entities.0.aliasExclusions.0',
    ]);
  });
});

describe('aliasChapterExclusions (F08-8a)', () => {
  const withChapters = (aliasChapterExclusions: unknown) => {
    const body = structuredClone(en);
    return { ...body, entities: [{ ...body.entities[0], aliasChapterExclusions }] };
  };
  const paths = (value: unknown) =>
    checkBookWorldImport(withChapters(value), 'en').errors.map((e) => e.path);

  it('the import takes chapters per form; garbage is refused by path', () => {
    expect(paths([{ form: 'Rodya', chapters: [2, 15] }])).toEqual([]);
    expect(paths(null)).toEqual([]);
    expect(paths([{ form: 'Rodya', chapters: [0] }])).toEqual([
      'entities.0.aliasChapterExclusions.0.chapters.0',
    ]);
    expect(paths([{ form: 'Rodya', chapters: [1.5] }])).toEqual([
      'entities.0.aliasChapterExclusions.0.chapters.0',
    ]);
    expect(paths([{ form: 'Rodya', chapters: [] }])).toEqual([
      'entities.0.aliasChapterExclusions.0.chapters',
    ]);
    expect(paths([{ form: ' ', chapters: [1] }])).toEqual([
      'entities.0.aliasChapterExclusions.0.form',
    ]);
    expect(paths([{ form: 'Rodya', chapters: [1], note: 'x' }])).toEqual([
      'entities.0.aliasChapterExclusions.0.note',
    ]);
    expect(
      paths(
        Array.from({ length: BOOK_WORLD_LIMITS.chapterExclusions + 1 }, () => ({
          form: 'R',
          chapters: [1],
        }))
      )
    ).toEqual(['entities.0.aliasChapterExclusions']);
  });
});

describe('parseChapterExclusions (F08-8a)', () => {
  it('the form runs to the last colon; blank lines are skipped', () => {
    expect(parseChapterExclusions('Mr. X: Y: 3, 4\n\n  Simon :6  ')).toEqual({
      list: [
        { form: 'Mr. X: Y', chapters: [3, 4] },
        { form: 'Simon', chapters: [6] },
      ],
      errors: [],
    });
  });

  it.each([
    ['no colon', 'Simon 6'],
    ['no form', ': 6'],
    ['no chapters', 'Simon:'],
    ['an empty number', 'Simon: 2,,3'],
    ['a trailing comma', 'Simon: 2,'],
    ['not a number', 'Simon: six'],
  ])('a line with %s is an error that names the line', (_label, line) => {
    const { list, errors } = parseChapterExclusions(`Peter: 1\n${line}`);
    expect(list).toEqual([{ form: 'Peter', chapters: [1] }]);
    expect(errors).toEqual([
      {
        path: 'aliasChapterExclusions.1',
        message: expect.stringContaining(`line "${line.trim()}"`),
      },
    ]);
  });
});

describe('book world entity card body (F08-1)', () => {
  const entity = {
    ...(structuredClone(en.entities[0]) as unknown as BookWorldEntity),
    hasCore: false,
    isIndexable: true,
    updatedAt: '2026-11-14T00:00:00.000Z',
    createdAt: '2026-11-14T00:00:00.000Z',
    mentions: null,
  };

  it('the saved entity goes back unchanged through the form', () => {
    const built = worldEntityRequestFromForm(formFromWorldEntity(entity), 'en', 'character');
    expect(built.errors).toEqual([]);
    // Пустой `speakerKey` сервер и так хранит как `null`: проверка его нормализует.
    expect(built.data?.quotes).toEqual(
      en.entities[0].quotes.map((q) => ({ speakerKey: null, ...q }))
    );
    expect(built.data?.arc?.stages).toEqual(en.entities[0].arc.stages);
    expect(built.data?.aliases).toEqual(en.entities[0].aliases);
  });

  it('an empty field is sent as null (cleared), a broken JSON list by its path', () => {
    const form = formFromWorldEntity(entity);
    form.texts.critique = '   ';
    expect(worldEntityRequestFromForm(form, 'en', 'character').data?.critique).toBeNull();
    form.lists.quotes = '[';
    expect(worldEntityRequestFromForm(form, 'en', 'character').errors).toEqual([
      { path: 'quotes', message: 'invalid JSON' },
    ]);
  });
});

describe('book world prompt inputs (F08-1)', () => {
  const version = {
    title: 'Crime and Punishment',
    author: 'F. Dostoevsky',
    language: 'en' as const,
  };
  const chapters = [
    { number: 1, title: 'One' },
    { number: 2, title: 'Two' },
  ];

  it('lists chapters, analysis heroes and dossier heroes with name variants', () => {
    const dossier = promptDossierFromStatus(
      {
        status: 'ready',
        data: {
          characters: [{ key: 'rodya', name: 'Raskolnikov', variants: ['Rodya', 'Rodion'] }],
          entities: [{ key: 'garret', name: 'The garret', kind: 'place' }],
        },
      } as unknown as DossierStatus,
      'en'
    );
    const text = buildWorldPromptInputsText(
      version,
      chapters,
      2,
      [{ key: 'raskolnikov', name: 'Rodion Raskolnikov', role: 'main' }],
      dossier
    );
    expect(text).toContain('1 — One\n2 — Two');
    expect(text).toContain(
      'Герои анализа этой версии (ключ — имя — роль):\nraskolnikov — Rodion Raskolnikov — main'
    );
    expect(text).toContain('rodya — Raskolnikov — Rodya, Rodion');
    expect(text).toContain('garret — The garret');
  });

  it('without the dossier (not admin) there is no dossier section at all', () => {
    const text = buildWorldPromptInputsText(version, [], 0, null, null);
    expect(text).toContain('глав нет');
    expect(text).not.toContain('досье');
  });
});
