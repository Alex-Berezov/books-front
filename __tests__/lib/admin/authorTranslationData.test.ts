import { describe, expect, it } from 'vitest';
import {
  emptyTranslationForm,
  hasTranslationData,
  unnamedLanguages,
  type AuthorTranslationForm,
} from '@/lib/admin/author-form-state';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * «У перевода есть данные» решает, откажет ли сохранение языку без имени (иначе перевод
 * молча не создастся). Считается по тому, что реально ушло бы в запрос: пустой FAQ,
 * `[]` в редакторе блока или пустая разметка биографии данными не считаются.
 */
const withDraft = (key: 'quotes' | 'awards', text: string): AuthorTranslationForm => {
  const form = emptyTranslationForm();
  return { ...form, drafts: { ...form.drafts, [key]: { text, issues: null } } };
};

describe('hasTranslationData', () => {
  it('пустой перевод — данных нет; служебное seo данными не считается', () => {
    const form = emptyTranslationForm();
    expect(hasTranslationData(form)).toBe(false);
    expect(hasTranslationData({ ...form, seo: { ...form.seo, metaTitle: 'x' } })).toBe(false);
  });

  it.each([
    ['slug', { slug: 'x' }],
    ['tagline', { tagline: 'x' }],
    ['wikidataUrl', { wikidataUrl: 'https://www.wikidata.org/wiki/Q1' }],
    ['wikipediaUrl', { wikipediaUrl: 'https://en.wikipedia.org/wiki/X' }],
    ['biography', { biography: '<p>Текст</p>' }],
    ['similarSlugs', { similarSlugs: 'oscar-wilde' }],
    ['faq', { faq: [{ question: 'Q?', answer: '' }] }],
  ])('%s — данные', (_name, patch) => {
    expect(hasTranslationData({ ...emptyTranslationForm(), ...patch })).toBe(true);
  });

  it('факты — данные', () => {
    const form = emptyTranslationForm();
    expect(
      hasTranslationData({ ...form, facts: { ...form.facts, birthPlace: 'Ясная Поляна' } })
    ).toBe(true);
  });

  it('блок с элементом и неразбираемый текст блока — данные', () => {
    expect(hasTranslationData(withDraft('quotes', '[{"text":"q"}]'))).toBe(true);
    expect(hasTranslationData(withDraft('awards', '[{"name":'))).toBe(true);
  });

  it.each([
    ['пустая разметка биографии', { biography: '<p></p>' }],
    ['пустые строки FAQ', { faq: [{ question: ' ', answer: '' }] }],
    ['запятые в похожих', { similarSlugs: ' , ' }],
  ])('%s — не данные', (_name, patch) => {
    expect(hasTranslationData({ ...emptyTranslationForm(), ...patch })).toBe(false);
  });

  it.each(['[]', 'null', '{}', '  '])('текст блока «%s» — не данные', (text) => {
    expect(hasTranslationData(withDraft('quotes', text))).toBe(false);
  });
});

describe('unnamedLanguages', () => {
  it('язык с данными без имени назван, пустой и названный — нет', () => {
    const forms = Object.fromEntries(
      (['en', 'es', 'fr', 'pt', 'ru'] as SupportedLang[]).map((lang) => [
        lang,
        emptyTranslationForm(),
      ])
    ) as Record<SupportedLang, AuthorTranslationForm>;
    forms.en = { ...forms.en, name: 'Leo Tolstoy', slug: 'leo-tolstoy' };
    forms.es = { ...forms.es, biography: '<p>Biografía</p>' };
    forms.fr = { ...forms.fr, faq: [{ question: '', answer: '' }] };

    expect(unnamedLanguages(forms)).toEqual(['es']);
  });
});
