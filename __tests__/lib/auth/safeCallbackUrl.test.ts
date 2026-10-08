// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { safeCallbackUrl } from '@/lib/auth/safe-callback-url';

/**
 * `LEGACY-445`: `?callbackUrl=` уходит в `router.push` и `signIn` после входа. Всё, что ведёт
 * не на наш origin или не разбирается однозначно, заменяется на `/${lang}`.
 */

const ORIGIN = 'https://bibliaris.com';

const BAD = [
  '//evil.example',
  '/\\evil.example',
  '\\\\evil.example',
  '/\t/evil.example',
  '/\n/evil.example',
  '/%09/evil.example',
  '/%0A/evil.example',
  '/%5Cevil.example',
  '///evil.example',
  // Точка-сегменты: путь своего origin нормализуется в `//evil.example` (ревью T118).
  '/.//evil.example/login',
  '/a/..//evil.example',
  '/%2e//evil.example',
  'javascript:alert(1)',
  'JavaScript:alert(1)',
  ' javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'https://evil.example',
  'https://bibliaris.com.evil.example/en',
  'https://bibliaris.com@evil.example/en',
  'http://bibliaris.com/en',
];

describe('safeCallbackUrl (LEGACY-445)', () => {
  it.each(BAD)('falls back to the language root for %j', (raw) => {
    expect(safeCallbackUrl(raw, 'ru', ORIGIN)).toBe('/ru');
  });

  it('falls back when the parameter is missing', () => {
    expect(safeCallbackUrl(null, 'en', ORIGIN)).toBe('/en');
    expect(safeCallbackUrl('', 'en', ORIGIN)).toBe('/en');
  });

  it.each([
    ['/ru/books', '/ru/books'],
    ['/admin/en', '/admin/en'],
    ['/en/book/dracula?tab=reviews#top', '/en/book/dracula?tab=reviews#top'],
    ['https://bibliaris.com/en/profile', '/en/profile'],
    // Литеральный `%` после `searchParams.get` — свой адрес, а не повод для запасного.
    ['/en/search?q=100%', '/en/search?q=100%'],
    ['/en/%2F/x', '/en/%2F/x'],
    // Закодированный `\` в строке запроса — законный поиск, не обход.
    ['/ru/catalog?q=a%5Cb', '/ru/catalog?q=a%5Cb'],
  ])('keeps the own path %j', (raw, expected) => {
    expect(safeCallbackUrl(raw, 'ru', ORIGIN)).toBe(expected);
  });
});
