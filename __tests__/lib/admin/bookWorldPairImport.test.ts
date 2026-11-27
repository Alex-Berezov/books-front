import { describe, expect, it } from 'vitest';
import { BOOK_WORLD_LIMITS } from '@/lib/admin/book-world-blocks';
import { formFromWorldEntity } from '@/lib/admin/book-world-form-state';
import {
  analyzeBookWorldEntityImport,
  analyzeBookWorldImport,
  checkBookWorldImport,
  worldEntityRequestFromForm,
} from '@/lib/admin/book-world-validation';
import type { BookWorldEntity } from '@/types/api-schema';
import pairEn from '../../fixtures/example-world-pair.en.json';
import pairEs from '../../fixtures/example-world-pair.es.json';
import pairFr from '../../fixtures/example-world-pair.fr.json';
import pairPt from '../../fixtures/example-world-pair.pt.json';
import pairRu from '../../fixtures/example-world-pair.ru.json';
import { detail } from '../../helpers/worldApi';

/**
 * F08-8c: пара героев в импорте и записи админки. Форма - `books/.../dto/book-world-blocks.dto.ts`:
 * непустые поля пары у героя и поля героя у пары бэкенд отбивает 400, фронт - ошибкой с путём;
 * пустые (`null`, `""`, `[]`) бэкенд принимает - фронт тоже и выкидывает их из тела.
 */

const compareRow = (i: number) => ({
  feature: `Feature ${i}`,
  a: `A ${i}`,
  chapterA: 1,
  b: `B ${i}`,
  chapterB: 2,
});

const pair = (patch: Record<string, unknown> = {}) => ({
  key: 'anna--tom',
  type: 'pair',
  name: 'Anna and Tom',
  short: 'Two travellers.',
  compare: [1, 2, 3, 4].map(compareRow),
  bonds: 'The crossing.',
  differences: 'Map and lamp.',
  quotes: [
    {
      text: 'Lamp.',
      chapter: 2,
      speakerKey: 'anna',
      aboutKey: 'tom',
      interpretation: 'Her view.',
    },
  ],
  conclusion: 'One leads.',
  faq: [{ question: 'Who leads?', answer: 'Anna.' }],
  ...patch,
});

const world = (entity: Record<string, unknown>) => ({ language: 'en', entities: [entity] });
const paths = (input: unknown) =>
  checkBookWorldImport(structuredClone(input), 'en').errors.map((e) => e.path);

describe('пара героев: импорт и запись (F08-8c)', () => {
  it('запись принимает героя и пару, другой тип отбивает по пути type', () => {
    expect(paths(world({ key: 'anna', type: 'character', name: 'Anna' }))).toEqual([]);
    expect(paths(world(pair()))).toEqual([]);
    expect(paths(world({ key: 'harbour', type: 'organization', name: 'Harbour' }))).toEqual([
      'entities.0.type',
    ]);
  });

  it('цитата пары без aboutKey или с пустым speakerKey - ошибка на пути ключа (бэкенд: checkWorldPair)', () => {
    const [quote] = pair().quotes;
    const { aboutKey: _about, ...noAbout } = quote;
    expect(paths(world(pair({ quotes: [noAbout] })))).toEqual(['entities.0.quotes.0.aboutKey']);
    expect(paths(world(pair({ quotes: [{ ...quote, speakerKey: '' }] })))).toEqual([
      'entities.0.quotes.0.speakerKey',
    ]);
    expect(paths(world(pair({ quotes: [{ ...quote, speakerKey: null }] })))).toEqual([
      'entities.0.quotes.0.speakerKey',
    ]);
  });

  it('JSON пары со всеми полями проходит импорт версии и одной сущности', () => {
    expect(checkBookWorldImport(world(pair()), 'en').errors).toEqual([]);
    const text = JSON.stringify({ language: 'en', ...pair() });
    const one = analyzeBookWorldEntityImport(text, 'en', null);
    expect(one.errors).toEqual([]);
    expect(one.data?.key).toBe('anna--tom');
    expect(analyzeBookWorldImport(JSON.stringify(world(pair())), 'en').errors).toEqual([]);
  });

  it('строк сравнения не больше 8: девятая - ошибка на пути списка', () => {
    const rows = Array.from({ length: BOOK_WORLD_LIMITS.compare + 1 }, (_, i) => compareRow(i));
    expect(paths(world(pair({ compare: rows })))).toEqual(['entities.0.compare']);
  });

  it('строка сравнения без главы стороны - ошибка на пути поля', () => {
    const bad = [{ ...compareRow(1), chapterB: undefined }];
    expect(paths(world(pair({ compare: bad })))).toEqual(['entities.0.compare.0.chapterB']);
  });

  it('поле героя у пары - неизвестный ключ с путём (бэкенд: 400)', () => {
    // Порядок ошибок схема не держит (их показывают списком по путям) - сравнение без порядка.
    expect(paths(world(pair({ aliases: ['Anna'], role: 'main' }))).sort()).toEqual([
      'entities.0.aliases',
      'entities.0.role',
    ]);
  });

  // Пустое - по виду поля, как его пропускает DTO бэкенда: список - null и [], текст - null и пробелы,
  // «профиль» - null и объект с пустыми полями, роль и путь - null
  // (`books/src/modules/book-world/dto/update-book-world.dto.ts`). В тело уходит `null` - «очистить».
  const characterOnly = {
    role: null,
    aliases: [],
    aliasExclusions: null,
    aliasChapterExclusions: [],
    profile: { position: '  ' },
    appearance: '',
    character: '   ',
    arc: null,
    scenes: [],
    relations: null,
    critique: null,
    prototypes: '',
    adaptations: [],
    sources: null,
  };
  const pairOnly = { compare: [], bonds: '', differences: '  ', conclusion: null };
  // Тело уходит JSON: поле со значением undefined в него не попадает.
  const body = (data: unknown) => JSON.parse(JSON.stringify(data ?? null));

  it('все 14 полей героя у пары пустыми принимаются и уходят как null - «очистить», как бэкенд', () => {
    const result = checkBookWorldImport(world(pair(characterOnly)), 'en');
    expect(result.errors).toEqual([]);
    const [entity] = body(result.data?.entities);
    for (const key of Object.keys(characterOnly)) expect(entity[key]).toBeNull();
    // Ключа нет - «не трогать»: в теле его нет и сейчас.
    const [plain] = body(checkBookWorldImport(world(pair()), 'en').data?.entities);
    for (const key of Object.keys(characterOnly)) expect(plain).not.toHaveProperty(key);
  });

  it('пустое не своего вида у пары - ошибка «not a field of a pair», как 400 бэкенда', () => {
    const issues = (patch: Record<string, unknown>) =>
      checkBookWorldImport(world(pair(patch)), 'en').errors;
    // "" у списка (DTO: @IsArray), [] у текста (IsString), "" у роли, непустой «профиль», пустой путь
    // (у пути `from`/`to` обязательны).
    for (const patch of [
      { aliases: '' },
      { appearance: [] },
      { role: '' },
      { profile: { position: 'Clerk' } },
      { arc: {} },
    ]) {
      const [key] = Object.keys(patch);
      expect(issues(patch)).toEqual([
        { path: `entities.0.${key}`, message: 'not a field of a pair' },
      ]);
    }
    expect(issues({ aliases: ['Anna'] })).toEqual([
      { path: 'entities.0.aliases', message: 'not a field of a pair' },
    ]);
  });

  // F08-11d-2: ТЗ на иллюстрацию - поле героя; у пары непустое отбивается, как 400 бэкенда.
  it('ТЗ на иллюстрацию у пары: непустое - отказ на пути поля, пустое уходит как null', () => {
    expect(paths(world(pair({ imageBrief: 'Square portrait.' })))).toEqual([
      'entities.0.imageBrief',
    ]);
    const result = checkBookWorldImport(world(pair({ imageBrief: '' })), 'en');
    expect(result.errors).toEqual([]);
    expect(body(result.data?.entities)[0].imageBrief).toBeNull();
  });

  it('«профиль» у пары: null, {} и поля из пробелов или null - пусто; лишний ключ - отказ (BookWorldProfileDto)', () => {
    for (const profile of [
      null,
      {},
      { relationToMain: null },
      { position: ' ', relationToMain: '' },
    ]) {
      const result = checkBookWorldImport(world(pair({ profile })), 'en');
      expect(result.errors).toEqual([]);
      expect(body(result.data?.entities)[0].profile).toBeNull();
    }
    expect(paths(world(pair({ profile: { occupation: null } })))).toEqual(['entities.0.profile']);
  });

  it('все 4 поля пары у героя пустыми и aboutKey пустым в цитате героя принимаются и уходят как null', () => {
    for (const aboutKey of [null, '', '  ']) {
      const character = {
        key: 'anna',
        type: 'character',
        name: 'Anna',
        ...pairOnly,
        quotes: [{ text: 'x', chapter: 1, aboutKey, interpretation: 'y' }],
      };
      const result = checkBookWorldImport(world(character), 'en');
      expect(result.errors).toEqual([]);
      const [entity] = body(result.data?.entities);
      for (const key of Object.keys(pairOnly)) expect(entity[key]).toBeNull();
      expect(entity.quotes[0].aboutKey).toBeNull();
    }
  });

  it('поле пары у героя и aboutKey в цитате героя - неизвестные ключи', () => {
    const character = {
      key: 'anna',
      type: 'character',
      name: 'Anna',
      compare: [compareRow(1)],
      quotes: [{ text: 'x', chapter: 1, aboutKey: 'tom', interpretation: 'y' }],
    };
    expect(paths(world(character)).sort()).toEqual([
      'entities.0.compare',
      'entities.0.quotes.0.aboutKey',
    ]);
  });

  it('другие типы по-прежнему не принимаются', () => {
    expect(paths(world({ key: 'harbour', type: 'organization', name: 'Harbour' }))).toEqual([
      'entities.0.type',
    ]);
  });

  it('форма пары: поля пары из сущности и тело записи без полей героя', () => {
    const entity: BookWorldEntity = {
      ...detail('anna--tom').entity,
      type: 'pair',
      name: 'Anna and Tom',
      role: null,
      short: 'Two travellers.',
      aliases: null,
      compare: [compareRow(1)],
      bonds: 'The crossing.',
      differences: 'Map and lamp.',
      conclusion: 'One leads.',
      quotes: pair().quotes,
      faq: null,
    };
    const form = formFromWorldEntity(entity);
    expect(form.texts.bonds).toBe('The crossing.');
    expect(form.lists.compare).toBe(JSON.stringify([compareRow(1)], null, 2));

    const built = worldEntityRequestFromForm(form, 'en', 'pair');
    expect(built.errors).toEqual([]);
    expect(built.data).toEqual({
      language: 'en',
      type: 'pair',
      name: 'Anna and Tom',
      short: 'Two travellers.',
      compare: [compareRow(1)],
      bonds: 'The crossing.',
      differences: 'Map and lamp.',
      quotes: pair().quotes,
      conclusion: 'One leads.',
      faq: null,
    });
  });

  it('форма пары: битый JSON сравнения - ошибка с путём, запись не собирается', () => {
    const form = formFromWorldEntity(null);
    form.lists.compare = '[{';
    const built = worldEntityRequestFromForm(form, 'en', 'pair');
    expect(built.data).toBeNull();
    expect(built.errors).toEqual([{ path: 'compare', message: 'invalid JSON' }]);
  });
});

describe('pair reference example (F08-8c-2)', () => {
  // Эталон — побайтовая копия `books-app-docs/features/F08-book-wiki/prompts/example-world-pair.*.json`.
  it.each([
    ['en', pairEn],
    ['ru', pairRu],
    ['es', pairEs],
    ['fr', pairFr],
    ['pt', pairPt],
  ])('the pair reference example %s passes the check as is', (lang, example) => {
    const result = checkBookWorldImport(structuredClone(example), lang);
    expect(result.errors).toEqual([]);
    expect(result.data?.entities.map((e) => e.type)).toEqual(['pair']);
  });
});
