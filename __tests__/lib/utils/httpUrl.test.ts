// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { bookVersionBaseSchema } from '@/components/admin/books/BookForm/bookVersionSchema';
import { translationSchema as categorySchema } from '@/components/admin/categories/CategoryTranslationsModal/CategoryTranslationsModal.types';
import { pageSchema } from '@/components/admin/pages/PageForm/PageForm.types';
import { translationSchema as tagSchema } from '@/components/admin/tags/TagTranslationsModal/TagTranslationsModal.types';
import { isAbsoluteHttpUrl, isAbsoluteHttpUrlOrRootPath } from '@/lib/utils/http-url';
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
  // `T94`: то же, что отбивает `isURL` бэкенда и пропускает `new URL`.
  'https://-a.com',
  'https://a-.com',
  'https://a..com',
  'https://a.com.',
  'https://123',
  'https://a.com/<x>',
  'https://a.com/>',
  // Длиннее `max_allowed_length` у `isURL` (2084).
  `https://a.com/${'b'.repeat(2085 - 14)}`,
  // Ревью `T94`: `isFQDN` бэкенда пускает в метку только буквы, цифры и дефис, до 63 знаков,
  // без полноширинных; порт 1..65535; одна `@` и не больше одного `:` в userinfo.
  'https://a!b.com',
  'https://a$b.com',
  'https://a*b.com',
  `https://${'a'.repeat(64)}.com`,
  'https://ａ.com',
  'https://a.com:0',
  'https://a.com:65536',
  'https://a.com:8o',
  'https://user:pa:ss@a.com',
  'https://@a.com',
  'https://1.2.3.256',
  'https://:@a.com',
  'https://[zz]/',
  'https://[::ffff:1.2.3.256]/x',
  'https://[1::2::3]/x',
  'https://[fe80::1%eth 0]/x',
];
const GOOD = [
  'https://bibliaris.com/en/tag/fear',
  'http://localhost:5000/uploads/a.png',
  'https://1.2.3.4/x',
  'https://[::1]/x',
  'https://[::1]:8080/x',
  'https://u:p@a.com',
  // Ревью `T94`, круг 2: ветки разбора `isURL` без пути, пустой порт, схема в верхнем регистре, зона IPv6.
  'HTTPS://a.com',
  'https://a.com:',
  'https://a.com?x',
  'https://a.com#x',
  'https://[fe80::1%eth0]/x',
  // Круг 3: зона интерфейса бэкенда — `%[0-9a-zA-Z.]+` (`isIP`), с точкой.
  'https://[fe80::1%pvc1.3]/x',
  'https://[::ffff:1.2.3.4]/x',
  'https://a.com:8080/x?q=1#top',
  `https://${'a'.repeat(63)}.com`,
  `https://a.com/${'b'.repeat(2084 - 14)}`,
];

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

// `T94`: `BookVersion.authorPageUrl` — http(s) или путь от корня (`@IsAbsoluteHttpUrlOrRootPath()`).
describe('isAbsoluteHttpUrlOrRootPath (зеркало бэкенда, LEGACY-401)', () => {
  it.each([...GOOD, '/ru/author/oscar-wilde', '/', `/${'a'.repeat(2083)}`])(
    'принимает %s',
    (value) => {
      expect(isAbsoluteHttpUrlOrRootPath(value)).toBe(true);
    }
  );

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.example/x',
    'ftp://example.com/x',
    'example.com',
    'ru/author/x',
    '/ru/author/<x>',
    '/ru/author/x>',
    '/ru/author/a b',
    '/ru\\evil',
    '/ru/\u0000x',
    '/ru/\u007fx',
    '/ru/\nx',
    `/${'a'.repeat(2084)}`,
    '',
  ])('отбивает %j', (value) => {
    expect(isAbsoluteHttpUrlOrRootPath(value)).toBe(false);
  });
});

describe('поле authorPageUrl формы версии', () => {
  const shape = bookVersionBaseSchema.shape.authorPageUrl;

  it.each(['', '/ru/author/wilde', 'https://example.com/a'])('принимает %j', (value) => {
    expect(shape.safeParse(value).success).toBe(true);
  });

  it.each(['javascript:alert(1)', 'wikipedia.org/wiki/X'])('отбивает %j', (value) => {
    expect(shape.safeParse(value).success).toBe(false);
  });
});
