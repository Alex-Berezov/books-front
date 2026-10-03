// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveAuthorHref } from '@/app/[lang]/book/[slug]/authorHref';

// `T94`, решение арбитра 03.10.2026: сохранённый `authorPageUrl` проверяется на выходе тем же
// правилом, что и запись; не прошёл — ссылка строится по слагу автора.
describe('resolveAuthorHref', () => {
  it.each([
    ['javascript:alert(1)', 'javascript:'],
    ['wikipedia.org/wiki/Oscar_Wilde', 'адрес без схемы'],
    ['//evil.example/x', 'протокол-относительный адрес'],
    ['/en/author/', 'путь с пустым слагом'],
  ])('%s (%s) уступает ссылке по слагу', (stored) => {
    expect(resolveAuthorHref(stored, 'oscar-wilde', 'en')).toBe('/en/author/oscar-wilde');
  });

  it.each(['https://en.wikipedia.org/wiki/Oscar_Wilde', '/ru/author/oscar-wilde'])(
    '%s остаётся ссылкой',
    (stored) => {
      expect(resolveAuthorHref(stored, 'other', 'en')).toBe(stored);
    }
  );

  it('без годного адреса и без слага ссылки нет', () => {
    expect(resolveAuthorHref('javascript:alert(1)', null, 'en')).toBeNull();
    expect(resolveAuthorHref(null, null, 'en')).toBeNull();
  });

  it('слаг автора кодируется в ссылке', () => {
    expect(resolveAuthorHref(null, 'о б/в', 'ru')).toBe('/ru/author/%D0%BE%20%D0%B1%2F%D0%B2');
  });

  it('пробелы по краям сохранённого адреса снимаются', () => {
    expect(resolveAuthorHref('  /ru/author/x  ', null, 'ru')).toBe('/ru/author/x');
  });
});
