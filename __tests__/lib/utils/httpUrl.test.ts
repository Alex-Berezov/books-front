// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { translationSchema as categorySchema } from '@/components/admin/categories/CategoryTranslationsModal/CategoryTranslationsModal.types';
import { pageSchema } from '@/components/admin/pages/PageForm/PageForm.types';
import { translationSchema as tagSchema } from '@/components/admin/tags/TagTranslationsModal/TagTranslationsModal.types';
import { isAbsoluteHttpUrl } from '@/lib/utils/http-url';
import { httpUrlOrEmpty } from '@/lib/utils/http-url-field';

// Второй ряд — то, что пропускает `new URL`, а `isURL` бэкенда отбивает (ревью `T75`).
const BAD = [
  'example.com',
  '/en/tag/fear',
  'ftp://example.com/x.png',
  'not a url',
  'javascript:1',
  ' https://example.org/en/a',
  'https://example.org/en/a ',
  'https://example.org/en/a b',
  'https:example.org',
  'https:/example.org',
  'https://exa_mple.com',
];
const GOOD = ['https://bibliaris.com/en/tag/fear', 'http://localhost:5000/uploads/a.png'];

describe('isAbsoluteHttpUrl (зеркало IsAbsoluteHttpUrl бэкенда, LEGACY-401)', () => {
  it.each(GOOD)('принимает %s', (value) => {
    expect(isAbsoluteHttpUrl(value)).toBe(true);
  });

  it.each(BAD)('отбивает %s', (value) => {
    expect(isAbsoluteHttpUrl(value)).toBe(false);
  });
});

describe('httpUrlOrEmpty', () => {
  it('пустая строка — «не задано»', () => {
    expect(httpUrlOrEmpty.safeParse('').success).toBe(true);
  });
});

describe.each([
  ['модалка перевода тега', tagSchema.shape],
  ['модалка перевода категории', categorySchema.shape],
  ['форма страницы', pageSchema.shape],
])('%s: seoCanonicalUrl и seoOgImageUrl', (_name, shape) => {
  it.each(['seoCanonicalUrl', 'seoOgImageUrl'] as const)('%s принимает пусто и http(s)', (key) => {
    for (const value of ['', ...GOOD]) {
      expect(shape[key].safeParse(value).success).toBe(true);
    }
  });

  it.each(['seoCanonicalUrl', 'seoOgImageUrl'] as const)('%s отбивает негодный адрес', (key) => {
    for (const value of BAD) {
      expect(shape[key].safeParse(value).success).toBe(false);
    }
  });
});
