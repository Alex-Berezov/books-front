import { describe, expect, it } from 'vitest';
import { formFromWorldEntity } from '@/lib/admin/book-world-form-state';
import {
  buildWorldPromptInputsText,
  promptDossierFromStatus,
} from '@/lib/admin/book-world-prompt-inputs';
import {
  analyzeBookWorldEntityImport,
  analyzeBookWorldImport,
  checkBookWorldImport,
  worldEntityRequestFromForm,
} from '@/lib/admin/book-world-validation';
import type { BookWorldEntity, DossierStatus } from '@/types/api-schema';
import en from '../../fixtures/example-world.en.json';
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
  ])('the reference example %s passes the check as is', (lang, example) => {
    const result = checkBookWorldImport(structuredClone(example), lang);
    expect(result.errors).toEqual([]);
    expect(result.data?.entities.length).toBe((example as Example).entities.length);
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

  it("type 'place' is refused: only characters are written in F08-1", () => {
    expect(paths(spoilt((e) => (e.type = 'place')))).toEqual(['entities.0.type']);
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
      analyzeBookWorldEntityImport(one({ type: 'place' }), 'en', null).errors.map((e) => e.path)
    ).toEqual(['type']);
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
