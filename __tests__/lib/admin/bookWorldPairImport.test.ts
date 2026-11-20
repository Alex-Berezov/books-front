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
import pairRu from '../../fixtures/example-world-pair.ru.json';
import { detail } from '../../helpers/worldApi';

/**
 * F08-8c: пара героев в импорте и записи админки. Форма - `books/.../dto/book-world-blocks.dto.ts`:
 * поля пары у героя и поля героя у пары бэкенд отбивает 400, фронт - ошибкой с путём.
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
    expect(paths(world({ key: 'harbour', type: 'place', name: 'Harbour' }))).toEqual([
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
    expect(paths(world(pair({ aliases: ['Anna'], role: 'main' })))).toEqual([
      'entities.0.aliases',
      'entities.0.role',
    ]);
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
    expect(paths(world({ key: 'harbour', type: 'place', name: 'Harbour' }))).toEqual([
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
  ])('the pair reference example %s passes the check as is', (lang, example) => {
    const result = checkBookWorldImport(structuredClone(example), lang);
    expect(result.errors).toEqual([]);
    expect(result.data?.entities.map((e) => e.type)).toEqual(['pair']);
  });
});
