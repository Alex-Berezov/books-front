import { describe, expect, it } from 'vitest';
import {
  emptyAuthorForm,
  translationToForm,
  type AuthorFormValues,
} from '@/lib/admin/author-form-state';
import { collectClearedFields, mergeAuthorImport } from '@/lib/admin/author-import';
import { analyzeAuthorImport, checkAuthorImport } from '@/lib/admin/author-validation';
import { authorUrl } from '@/lib/seo/author-page';
import type { AuthorImportData } from '@/lib/admin/author-page-blocks.schema';
import example from '../../fixtures/example-author.json';

// T5 (`tech.md` §0): ключа нет — поле не трогается; `null`/`[]` (у строки — и `''`) — очищается.

const parse = (input: unknown): AuthorImportData => {
  const result = checkAuthorImport(structuredClone(input));
  expect(result.errors).toEqual([]);
  return result.data!;
};

const dataJson = example;
const biographyJson = {
  translations: {
    en: { biography: '<h3>Childhood</h3><p>Born at Yasnaya Polyana.</p>' },
    ru: { biography: '<h3>Детство</h3><p>Родился в Ясной Поляне.</p>' },
  },
};

const filledAuthor = (): AuthorFormValues => {
  const form = emptyAuthorForm();
  form.general.birthDate = '1828-09-09';
  form.general.nativeName = 'Лев Николаевич Толстой';
  form.translations.en = translationToForm({
    language: 'en',
    name: 'Leo Tolstoy',
    slug: 'leo-tolstoy',
    biography: '<p>Old bio</p>',
    tagline: 'Russian writer',
    quotes: [{ text: 'All happy families…', source: 'Anna Karenina' }],
    awards: [{ name: 'Nobel Prize in Literature', year: 1902, nomination: true }],
    facts: { gender: 'male', occupations: ['novelist'] },
    similarSlugs: ['fyodor-dostoevsky'],
  });
  return form;
};

describe('mergeAuthorImport: два JSON на одного автора', () => {
  it('данные, потом биография — данные на месте, биография добавлена', () => {
    const afterData = mergeAuthorImport(emptyAuthorForm(), parse(dataJson));
    const merged = mergeAuthorImport(afterData, parse(biographyJson));

    expect(merged.translations.en.biography).toBe(biographyJson.translations.en.biography);
    expect(merged.translations.en.tagline).toBe(
      'Russian writer, author of War and Peace and Anna Karenina'
    );
    expect(merged.translations.en.blocks.notableWorks).toHaveLength(4);
    expect(merged.translations.ru.blocks.funFacts).toHaveLength(1);
    expect(merged.general.nativeName).toBe('Лев Николаевич Толстой');
  });

  it('биография, потом данные — биография на месте, данные добавлены', () => {
    const afterBio = mergeAuthorImport(emptyAuthorForm(), parse(biographyJson));
    const merged = mergeAuthorImport(afterBio, parse(dataJson));

    expect(merged.translations.en.biography).toBe(biographyJson.translations.en.biography);
    expect(merged.translations.ru.biography).toBe(biographyJson.translations.ru.biography);
    expect(merged.translations.en.name).toBe('Leo Tolstoy');
    expect(merged.translations.en.facts.occupations).toEqual([
      'novelist',
      'short story writer',
      'essayist',
    ]);
    expect(merged.translations.en.drafts.quotes.text).toContain('"bookSlug": "anna-karenina"');
  });

  it('ключа нет — поле не трогается; языки, которых нет в JSON, не выбрасываются', () => {
    const prev = filledAuthor();
    const merged = mergeAuthorImport(
      prev,
      parse({ translations: { ru: { name: 'Лев Толстой' } } })
    );

    expect(merged.translations.en).toEqual(prev.translations.en);
    expect(merged.general).toEqual(prev.general);
    expect(merged.translations.ru.name).toBe('Лев Толстой');
  });

  it('null и [] очищают поле, "" очищает строку верхнего уровня', () => {
    const merged = mergeAuthorImport(
      filledAuthor(),
      parse({
        nativeName: null,
        translations: {
          en: { awards: [], quotes: null, facts: null, tagline: '', similarSlugs: [] },
        },
      })
    );
    const en = merged.translations.en;

    expect(merged.general.nativeName).toBe('');
    expect(en.blocks.awards).toBeNull();
    expect(en.blocks.quotes).toBeNull();
    expect(en.drafts.awards.text).toBe('');
    expect(en.facts.gender).toBe('');
    expect(en.facts.occupations).toEqual([]);
    expect(en.tagline).toBe('');
    expect(en.similarSlugs).toBe('');
    // Нетронутое — на месте.
    expect(en.biography).toBe('<p>Old bio</p>');
    expect(merged.general.birthDate).toBe('1828-09-09');
  });

  it('новый язык в JSON создаёт перевод', () => {
    const merged = mergeAuthorImport(
      filledAuthor(),
      parse({ translations: { fr: { name: 'Léon Tolstoï', slug: 'leon-tolstoi' } } })
    );

    expect(merged.translations.fr.name).toBe('Léon Tolstoï');
    expect(merged.translations.fr.seo.canonicalUrl).toBe(authorUrl('fr', 'leon-tolstoi'));
  });

  it('similarSlugs принимается и массивом, и строкой через запятую', () => {
    const asArray = mergeAuthorImport(
      emptyAuthorForm(),
      parse({ translations: { en: { similarSlugs: ['a', 'b'] } } })
    );
    const asString = mergeAuthorImport(
      emptyAuthorForm(),
      parse({ translations: { en: { similarSlugs: 'a, b' } } })
    );

    expect(asArray.translations.en.similarSlugs).toBe('a, b');
    expect(asString.translations.en.similarSlugs).toBe('a, b');
  });

  it('портрет из JSON (совместимость) ставится всем языкам и не уходит в seo.ogImageUrl (В6)', () => {
    const merged = mergeAuthorImport(
      emptyAuthorForm(),
      parse({ translations: { en: { name: 'X', photoUrl: 'https://cdn.example.org/x.jpg' } } })
    );

    for (const lang of ['en', 'es', 'fr', 'pt', 'ru'] as const) {
      expect(merged.translations[lang].photoUrl).toBe('https://cdn.example.org/x.jpg');
      expect(merged.translations[lang].seo.ogImageUrl ?? '').toBe('');
    }
  });

  it('ogImageUrl из самого seo JSON сохраняется', () => {
    const merged = mergeAuthorImport(
      emptyAuthorForm(),
      parse({
        translations: {
          en: {
            photoUrl: 'https://cdn.example.org/x.jpg',
            seo: { ogImageUrl: 'https://cdn.example.org/og.jpg' },
          },
        },
      })
    );

    expect(merged.translations.en.seo.ogImageUrl).toBe('https://cdn.example.org/og.jpg');
  });
});

describe('mergeAuthorImport: правки ревью F02-2', () => {
  it('вложенный ключ seo с null/"" не перетирает ручное значение (шаблон шлёт ogImageUrl: null)', () => {
    const prev = filledAuthor();
    prev.translations.en.seo = {
      ...prev.translations.en.seo,
      ogImageUrl: 'https://cdn.example.org/manual-og.jpg',
      ogImageAlt: 'Manual alt',
    };
    const merged = mergeAuthorImport(
      prev,
      parse({ translations: { en: { seo: { ogImageUrl: null, ogImageAlt: '', metaTitle: 'T' } } } })
    );

    expect(merged.translations.en.seo).toMatchObject({
      ogImageUrl: 'https://cdn.example.org/manual-og.jpg',
      ogImageAlt: 'Manual alt',
      metaTitle: 'T',
    });
  });

  it('"seo": null целиком по-прежнему очищает seo (T5)', () => {
    const prev = filledAuthor();
    prev.translations.en.seo = { ...prev.translations.en.seo, metaTitle: 'Old' };
    const merged = mergeAuthorImport(prev, parse({ translations: { en: { seo: null } } }));

    expect(merged.translations.en.seo.metaTitle).toBeUndefined();
  });

  it('пустые name и slug не очищают перевод — иначе бэкенд удалил бы его вместе с адресом', () => {
    const merged = mergeAuthorImport(
      filledAuthor(),
      parse({ translations: { en: { name: '', slug: null, tagline: 'New' } } })
    );

    expect(merged.translations.en.name).toBe('Leo Tolstoy');
    expect(merged.translations.en.slug).toBe('leo-tolstoy');
    expect(merged.translations.en.tagline).toBe('New');
    expect(
      collectClearedFields(
        filledAuthor(),
        parse({ translations: { en: { name: '', slug: null } } })
      )
    ).toEqual([]);
  });
});

describe('collectClearedFields: список «будут очищены» (В7)', () => {
  it('называет только непустые поля, которые JSON очищает', () => {
    const cleared = collectClearedFields(
      filledAuthor(),
      parse({
        nativeName: '',
        deathDate: null,
        translations: {
          en: { awards: [], quotes: null, facts: null, tagline: '', timeline: [] },
          ru: { awards: [] },
        },
      })
    );

    expect(cleared).toEqual([
      { lang: null, field: 'nativeName' },
      { lang: 'en', field: 'tagline' },
      { lang: 'en', field: 'facts' },
      { lang: 'en', field: 'awards' },
      { lang: 'en', field: 'quotes' },
    ]);
  });

  it('JSON без очищающих значений — список пуст', () => {
    expect(collectClearedFields(filledAuthor(), parse(biographyJson))).toEqual([]);
  });
});

describe('analyzeAuthorImport', () => {
  it('JSON биографии на новый язык без имени — язык в списке «перевод не создастся»', () => {
    const result = analyzeAuthorImport(
      filledAuthor(),
      JSON.stringify({ translations: { es: { biography: '<p>x</p>' }, en: { tagline: 'y' } } })
    );

    expect(result.errors).toEqual([]);
    expect(result.unnamed).toEqual(['es']);
  });

  it('битый JSON — ошибка, данных нет', () => {
    const result = analyzeAuthorImport(emptyAuthorForm(), '{"translations": ');

    expect(result.data).toBeNull();
    expect(result.errors).toEqual([{ lang: null, path: '', reason: 'invalidJson' }]);
  });

  it('ошибка формы — импорт не применяется, список «очищены» не строится', () => {
    const result = analyzeAuthorImport(
      filledAuthor(),
      JSON.stringify({ translations: { en: { awards: [], funFacts: [{ text: 'x' }] } } })
    );

    expect(result.data).toBeNull();
    expect(result.errors.map((e) => `${e.lang} → ${e.path}`)).toEqual([
      'en → funFacts[0].sourceTitle',
      'en → funFacts[0].sourceUrl',
    ]);
    expect(result.cleared).toEqual([]);
  });
});
