// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isSafeHref } from '@/lib/utils/safe-href';

/**
 * `LEGACY-447`: ссылка из данных API (`wikipediaUrl`, вложение претензии, `sourceUrl`)
 * рендерится только со схемой `http:`/`https:`.
 */
describe('isSafeHref (LEGACY-447)', () => {
  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'ftp://example.com/file',
    '/en/author/wilde',
    '//evil.example',
    'not a url',
    '',
    null,
    undefined,
  ])('rejects %j', (value) => {
    expect(isSafeHref(value)).toBe(false);
  });

  it.each([
    'https://en.wikipedia.org/wiki/Oscar_Wilde',
    'http://www.wikidata.org/wiki/Q30875',
    'HTTPS://example.org/doc.pdf',
  ])('accepts %j', (value) => {
    expect(isSafeHref(value)).toBe(true);
  });
});
