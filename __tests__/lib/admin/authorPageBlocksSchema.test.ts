import { describe, expect, it } from 'vitest';
import {
  AUTHOR_PAGE_LIMITS,
  formatAuthorDataIssue,
  formatIssuePath,
} from '@/lib/admin/author-page-blocks';
import {
  checkAuthorBlock,
  checkAuthorFacts,
  checkAuthorImport,
  checkAuthorPhotoCredit,
} from '@/lib/admin/author-page-blocks.schema';
import example from '../../fixtures/example-author.json';

// F02-2: схема фронта — зеркало DTO бэкенда (`author-page-blocks.dto.ts`); фикстура — копия
// эталона `books-app-docs/features/F02-author-page/prompts/example-author.json` (решение арбитра).

const clone = <T>(value: T): T => structuredClone(value);

describe('checkAuthorImport', () => {
  it('принимает эталонный JSON примера без ошибок и предупреждений', () => {
    const result = checkAuthorImport(clone(example));

    expect(result.errors).toEqual([]);
    expect(result.unknownKeys).toEqual([]);
    expect(result.data?.translations.en?.notableWorks).toHaveLength(4);
    expect(result.data?.translations.ru?.tagline).toBe(
      'Русский писатель, автор «Войны и мира» и «Анны Карениной»'
    );
  });

  it('называет ошибку языком и путём: ru → funFacts[0].sourceUrl', () => {
    const input = clone(example) as { translations: { ru: { funFacts: { sourceUrl: string }[] } } };
    input.translations.ru.funFacts[0].sourceUrl = 'britannica.com/x';

    const result = checkAuthorImport(input);

    expect(result.data).toBeNull();
    expect(result.errors).toEqual([{ lang: 'ru', path: 'funFacts[0].sourceUrl', reason: 'url' }]);
    expect(formatAuthorDataIssue(result.errors[0])).toBe(
      'ru → funFacts[0].sourceUrl: must be an absolute http(s) link'
    );
  });

  it('факт без источника — ошибка обязательного поля', () => {
    const result = checkAuthorImport({
      translations: { ru: { funFacts: [{ text: 'Факт', sourceTitle: 'Британника' }] } },
    });

    expect(result.errors).toEqual([
      { lang: 'ru', path: 'funFacts[0].sourceUrl', reason: 'required' },
    ]);
    expect(formatAuthorDataIssue(result.errors[0])).toBe('ru → funFacts[0].sourceUrl: required');
  });

  it('неизвестный ключ — предупреждение, не отказ; ключ вырезан из данных', () => {
    const result = checkAuthorImport({
      extra: 1,
      translations: {
        de: { name: 'x' },
        en: { name: 'Leo Tolstoy', mood: 'calm', funFacts: [], seo: { metaTitle: 'T', foo: 'x' } },
      },
    });

    expect(result.errors).toEqual([]);
    expect(result.unknownKeys).toEqual(
      expect.arrayContaining([
        { lang: null, path: 'extra', reason: 'unknownKey' },
        { lang: null, path: 'translations.de', reason: 'unknownKey' },
        { lang: 'en', path: 'mood', reason: 'unknownKey' },
        { lang: 'en', path: 'seo.foo', reason: 'unknownKey' },
      ])
    );
    expect(result.unknownKeys).toHaveLength(4);
    expect(result.data).not.toHaveProperty('extra');
    expect(result.data?.translations).not.toHaveProperty('de');
    expect(result.data?.translations.en).not.toHaveProperty('mood');
    expect(result.data?.translations.en?.seo).toEqual({ metaTitle: 'T' });
  });

  it('неизвестный ключ внутри элемента блока тоже вырезается', () => {
    const result = checkAuthorImport({
      translations: { en: { quotes: [{ text: 'q', page: 12 }] } },
    });

    expect(result.unknownKeys).toEqual([
      { lang: 'en', path: 'quotes[0].page', reason: 'unknownKey' },
    ]);
    expect(result.data?.translations.en?.quotes).toEqual([{ text: 'q' }]);
  });

  it('JSON биографии (промпт № 2) — подмножество формата', () => {
    const result = checkAuthorImport({ translations: { ru: { biography: '<h3>Детство</h3>' } } });

    expect(result.errors).toEqual([]);
    expect(result.data?.translations.ru).toEqual({ biography: '<h3>Детство</h3>' });
  });

  it('без translations — ошибка обязательного поля', () => {
    expect(checkAuthorImport({ birthDate: '1828' }).errors).toEqual([
      { lang: null, path: 'translations', reason: 'required' },
    ]);
  });

  it('пустая подпись портрета из шаблона формата — «подписи нет», а не ошибка', () => {
    const result = checkAuthorImport({
      photoCredit: { author: '', license: '', licenseUrl: '', sourceUrl: '' },
      translations: {},
    });

    expect(result.errors).toEqual([]);
    expect(result.data?.photoCredit).toBeNull();
  });

  it('null у блока верхнего уровня сохраняется — по нему слияние очищает поле', () => {
    const result = checkAuthorImport({ translations: { en: { awards: null, facts: null } } });

    expect(result.data?.translations.en).toEqual({ awards: null, facts: null });
  });
});

describe('checkAuthorBlock', () => {
  it('"" и null у необязательного поля — нет значения', () => {
    const result = checkAuthorBlock(
      'notableWorks',
      [{ title: ' War and Peace ', year: null, bookSlug: '' }],
      'en'
    );

    expect(result.errors).toEqual([]);
    expect(result.data).toEqual([{ title: 'War and Peace' }]);
  });

  it('год — целое число в пределах', () => {
    const tooOld = checkAuthorBlock('timeline', [{ year: -3001, text: 'x' }], 'en');
    const fraction = checkAuthorBlock('timeline', [{ year: 1869.5, text: 'x' }], 'en');
    const asText = checkAuthorBlock('awards', [{ name: 'x', year: '1902' }], 'en');
    const antiquity = checkAuthorBlock('timeline', [{ year: -800, text: 'Илиада' }], 'en');

    expect(tooOld.errors).toEqual([
      {
        lang: 'en',
        path: 'timeline[0].year',
        reason: 'yearRange',
        params: { min: AUTHOR_PAGE_LIMITS.year.min, max: AUTHOR_PAGE_LIMITS.year.max },
      },
    ]);
    expect(fraction.errors[0]).toMatchObject({ path: 'timeline[0].year', reason: 'notInteger' });
    expect(asText.errors[0]).toMatchObject({ path: 'awards[0].year', reason: 'notNumber' });
    expect(antiquity.errors).toEqual([]);
  });

  it('слаги книг и авторов — формат SLUG_PATTERN бэкенда; пусто и null — нет значения', () => {
    const bad = 'War-and-Peace';
    expect(checkAuthorBlock('notableWorks', [{ title: 't', bookSlug: bad }], 'en').errors).toEqual([
      { lang: 'en', path: 'notableWorks[0].bookSlug', reason: 'slug' },
    ]);
    expect(
      checkAuthorBlock('startHere', [{ bookSlug: 'war--peace', reason: 'r' }], 'en').errors
    ).toEqual([{ lang: 'en', path: 'startHere[0].bookSlug', reason: 'slug' }]);
    expect(
      checkAuthorBlock('influences', { influencedBy: [{ name: 'A', authorSlug: 'a_b' }] }, 'en')
        .errors
    ).toEqual([{ lang: 'en', path: 'influences.influencedBy[0].authorSlug', reason: 'slug' }]);
    expect(checkAuthorBlock('quotes', [{ text: 'q', bookSlug: '-x' }], 'en').errors).toEqual([
      { lang: 'en', path: 'quotes[0].bookSlug', reason: 'slug' },
    ]);
    for (const key of ['timeline', 'adaptations'] as const) {
      const item = key === 'timeline' ? { year: 1, text: 't' } : { title: 't', kind: 'film' };
      expect(checkAuthorBlock(key, [{ ...item, bookSlug: 'Bad Slug' }], 'en').errors).toEqual([
        { lang: 'en', path: `${key}[0].bookSlug`, reason: 'slug' },
      ]);
    }
    expect(
      checkAuthorBlock(
        'quotes',
        [
          { text: 'q', bookSlug: '' },
          { text: 'r', bookSlug: null },
        ],
        'en'
      ).errors
    ).toEqual([]);
    expect(formatAuthorDataIssue({ lang: 'en', path: 'quotes[0].bookSlug', reason: 'slug' })).toBe(
      'en → quotes[0].bookSlug: must be a slug: lowercase latin letters, digits and single hyphens'
    );
  });

  it('цитат — не больше 50, как в DTO (51-я — ошибка)', () => {
    const quotes = (n: number) => Array.from({ length: n }, (_, i) => ({ text: `q${i}` }));

    expect(AUTHOR_PAGE_LIMITS.quotes).toBe(50);
    expect(checkAuthorBlock('quotes', quotes(50), 'en').errors).toEqual([]);
    expect(checkAuthorBlock('quotes', quotes(51), 'en').errors).toEqual([
      { lang: 'en', path: 'quotes', reason: 'tooMany', params: { max: 50 } },
    ]);
  });

  it('держит лимиты DTO: число элементов и длину строк', () => {
    const many = Array.from({ length: AUTHOR_PAGE_LIMITS.startHere.list + 1 }, () => ({
      bookSlug: 'a',
      reason: 'b',
    }));
    const longReason = [
      { bookSlug: 'a', reason: 'x'.repeat(AUTHOR_PAGE_LIMITS.startHere.reason + 1) },
    ];

    expect(checkAuthorBlock('startHere', many, 'fr').errors).toEqual([
      { lang: 'fr', path: 'startHere', reason: 'tooMany', params: { max: 5 } },
    ]);
    expect(checkAuthorBlock('startHere', longReason, 'fr').errors).toEqual([
      { lang: 'fr', path: 'startHere[0].reason', reason: 'tooLong', params: { max: 220 } },
    ]);
  });

  it('вид экранизации — из списка', () => {
    const result = checkAuthorBlock('adaptations', [{ title: 'x', kind: 'radio' }], 'pt');

    expect(result.errors).toEqual([
      {
        lang: 'pt',
        path: 'adaptations[0].kind',
        reason: 'oneOf',
        params: { values: 'film, series, animation, play, opera, other' },
      },
    ]);
  });

  it('в редакторе неизвестный ключ — ошибка: правится на месте', () => {
    const result = checkAuthorBlock(
      'sources',
      [{ title: 't', url: 'https://e.org', note: 1 }],
      'es'
    );

    expect(result.data).toBeNull();
    expect(result.errors).toEqual([{ lang: 'es', path: 'sources[0].note', reason: 'unknownKey' }]);
  });

  it('влияния без одного из списков отдаются с пустым списком', () => {
    const result = checkAuthorBlock('influences', { influencedBy: [{ name: 'Руссо' }] }, 'ru');

    expect(result.data).toEqual({ influencedBy: [{ name: 'Руссо' }], influenced: [] });
  });

  it('цитата старого формата (без bookSlug, с пустым источником) проходит', () => {
    const result = checkAuthorBlock('quotes', [{ text: 'q', source: '' }], 'en');

    expect(result.errors).toEqual([]);
    expect(result.data).toEqual([{ text: 'q' }]);
  });
});

describe('formatIssuePath', () => {
  it('индекс — в скобках, ключ — через точку', () => {
    expect(formatIssuePath(['funFacts', 2, 'sourceUrl'])).toBe('funFacts[2].sourceUrl');
    expect(formatIssuePath([0, 'text'])).toBe('[0].text');
    expect(formatIssuePath([])).toBe('');
  });
});

describe('checkAuthorFacts', () => {
  it('приводит пустое к отсутствию и держит лимиты, путь начинается с facts', () => {
    const ok = checkAuthorFacts({ gender: '', birthPlace: ' Paris ', genres: ['novel'] }, 'fr');
    const bad = checkAuthorFacts(
      { gender: 'other', occupations: ['x'.repeat(AUTHOR_PAGE_LIMITS.facts.item + 1)] },
      'fr'
    );

    expect(ok.errors).toEqual([]);
    expect(ok.data).toEqual({ birthPlace: 'Paris', genres: ['novel'] });
    expect(bad.errors).toEqual([
      { lang: 'fr', path: 'facts.gender', reason: 'oneOf', params: { values: 'male, female' } },
      {
        lang: 'fr',
        path: 'facts.occupations[0]',
        reason: 'tooLong',
        params: { max: AUTHOR_PAGE_LIMITS.facts.item },
      },
    ]);
  });
});

describe('checkAuthorPhotoCredit', () => {
  it('автор снимка и лицензия обязательны, ссылки — абсолютные http(s)', () => {
    const result = checkAuthorPhotoCredit({ author: 'A', license: '', licenseUrl: 'cc.org' });

    expect(result.errors).toEqual([
      { lang: null, path: 'photoCredit.license', reason: 'required' },
      { lang: null, path: 'photoCredit.licenseUrl', reason: 'url' },
    ]);
    expect(formatAuthorDataIssue(result.errors[0])).toBe('author → photoCredit.license: required');
  });
});
