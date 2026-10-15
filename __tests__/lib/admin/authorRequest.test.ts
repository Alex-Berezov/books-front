import { describe, expect, it } from 'vitest';
import { emptyAuthorForm, type AuthorFormValues } from '@/lib/admin/author-form-state';
import { AUTHOR_BLOCK_KEYS } from '@/lib/admin/author-page-blocks';
import { buildAuthorRequest } from '@/lib/admin/author-request';
import * as checker from '@/lib/admin/author-validation';
import type { SupportedLang } from '@/lib/i18n/lang';

const NO_LANGS = new Set<SupportedLang>();

const withEnglish = (): AuthorFormValues => {
  const values = emptyAuthorForm();
  values.translations.en.name = ' Leo Tolstoy ';
  values.translations.en.slug = 'leo-tolstoy';
  return values;
};

describe('buildAuthorRequest', () => {
  it('собирает тело: каждый блок из AUTHOR_BLOCK_KEYS, пустой — null', () => {
    const values = withEnglish();
    values.translations.en.drafts.awards.text = '[{"name":"Nobel","year":1902,"nomination":true}]';
    values.translations.en.drafts.quotes.text = '[{"text":"q","source":""}]';
    values.general.nativeName = ' Лев Толстой ';

    const result = buildAuthorRequest(values, NO_LANGS, checker);

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    const [en] = result.payload.translations;
    for (const key of AUTHOR_BLOCK_KEYS) expect(en).toHaveProperty(key);
    expect(en.name).toBe('Leo Tolstoy');
    expect(en.awards).toEqual([{ name: 'Nobel', year: 1902, nomination: true }]);
    expect(en.quotes).toEqual([{ text: 'q' }]);
    expect(en.timeline).toBeNull();
    expect(en.facts).toBeNull();
    expect(result.payload.nativeName).toBe('Лев Толстой');
    expect(result.payload.photoCredit).toBeNull();
  });

  it('очищенный в форме блок уходит явным null, а не пропущенным ключом', () => {
    const values = withEnglish();
    // Был блок — владелец стёр текст редактора целиком.
    values.translations.en.blocks.awards = [
      { name: 'Nobel', year: undefined, nomination: undefined },
    ];
    values.translations.en.drafts.awards.text = '';
    values.translations.en.blocks.quotes = [{ text: 'q', source: undefined, bookSlug: undefined }];
    values.translations.en.drafts.quotes.text = '[]';

    const result = buildAuthorRequest(values, NO_LANGS, checker);

    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    const sent = JSON.parse(JSON.stringify(result.payload)) as {
      translations: Record<string, unknown>[];
    };
    for (const key of AUTHOR_BLOCK_KEYS) {
      expect(sent.translations[0]).toHaveProperty(key, null);
    }
    expect(sent.translations[0]).toHaveProperty('facts', null);
    expect(sent.translations[0]).toHaveProperty('tagline', null);
  });

  it('ошибки блоков, фактов и подписи — списком по всем языкам, тела нет', () => {
    const values = withEnglish();
    values.translations.ru.name = 'Лев Толстой';
    values.translations.ru.slug = 'lev-tolstoy';
    values.translations.en.drafts.funFacts.text =
      '[{"text":"t","sourceTitle":"s","sourceUrl":"x"}]';
    values.translations.ru.facts.gender = 'male';
    values.translations.ru.drafts.awards.text = '[';
    values.general.photoCredit.author = 'A';

    const result = buildAuthorRequest(values, NO_LANGS, checker);

    expect(result).toEqual({
      kind: 'issues',
      issues: [
        { lang: 'en', path: 'funFacts[0].sourceUrl', reason: 'url' },
        { lang: 'ru', path: 'awards', reason: 'invalidJson' },
        { lang: null, path: 'photoCredit.license', reason: 'required' },
      ],
    });
  });

  it('язык без имени пропускается, если перевода у автора не было', () => {
    const result = buildAuthorRequest(withEnglish(), NO_LANGS, checker);

    expect(result.kind === 'ok' && result.payload.translations.map((t) => t.language)).toEqual([
      'en',
    ]);
  });

  it('перевод, который есть у автора, с пустым именем — отказ, а не пропуск', () => {
    const result = buildAuthorRequest(withEnglish(), new Set<SupportedLang>(['en', 'ru']), checker);

    expect(result).toEqual({
      kind: 'error',
      message:
        'Name is required for language RU: without it the translation and its page would be deleted',
    });
  });

  it('язык с данными, но без имени — отказ со списком языков, а не тихий пропуск', () => {
    const values = withEnglish();
    values.translations.es.biography = '<p>Biografía</p>';
    values.translations.fr.drafts.awards.text = '[{"name":"Prix"}]';

    expect(buildAuthorRequest(values, NO_LANGS, checker)).toEqual({
      kind: 'error',
      message:
        'These languages have data but no name, so their translation would not be created: ES, FR. Fill in the name and slug, or clear the data',
    });
  });

  it('без имени ни на одном языке — отказ', () => {
    expect(buildAuthorRequest(emptyAuthorForm(), NO_LANGS, checker)).toEqual({
      kind: 'error',
      message: 'At least one translation with a name is required',
    });
  });
});
