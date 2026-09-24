// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  RICH_HTML_ALLOWED_ATTRIBUTES,
  RICH_HTML_ALLOWED_SCHEMES,
  RICH_HTML_ALLOWED_TAGS,
  RICH_HTML_CODE_CLASS,
  RICH_HTML_DROP_CONTENT_TAGS,
  RICH_HTML_IMG_SCHEMES,
  RICH_HTML_TEXT_ALIGN_STYLE,
} from '@/lib/utils/rich-html';
import { describeSanitizeContract } from './richHtmlCases';

/**
 * Second belt behind the backend (`LEGACY-414`): HTML stored before the backend
 * started sanitising on write reaches readers only through `sanitizeRichHtml`.
 * This file runs the Node branch (sanitize-html) - it is what renders on the
 * server, including SSR of client components. The browser branch (DOMPurify)
 * runs the same cases in `richHtml.browser.test.ts`.
 */
describe('sanitizeRichHtml, Node branch', () => {
  it('runs without a window, so the sanitize-html branch is taken', () => {
    expect(typeof window).toBe('undefined');
  });

  describeSanitizeContract();

  // Сверка не межрепозиторная: общего файла нет (D:/newDev/CLAUDE.md, запрет 4). Тот же литерал держит копию
  // в books/src/shared/sanitize/rich-html.spec.ts — меняются только вместе, в двух коммитах одной пачки.
  it('pins the allow-list to the literal shared with the backend spec', () => {
    expect([...RICH_HTML_ALLOWED_TAGS].sort()).toEqual(
      [
        'a',
        'blockquote',
        'br',
        'code',
        'em',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'hr',
        'img',
        'li',
        'ol',
        'p',
        'pre',
        's',
        'strong',
        'u',
        'ul',
      ].sort()
    );
    expect(RICH_HTML_ALLOWED_ATTRIBUTES).toEqual({
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      ol: ['start'],
      code: ['class'],
      p: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
      h4: ['style'],
      h5: ['style'],
      h6: ['style'],
    });
    expect(RICH_HTML_ALLOWED_SCHEMES).toEqual(['http', 'https', 'mailto']);
    expect(RICH_HTML_IMG_SCHEMES).toEqual(['http', 'https']);
    expect(String(RICH_HTML_TEXT_ALIGN_STYLE)).toBe(
      String(/^\s*text-align\s*:\s*(left|right|center|justify)\s*;?\s*$/i)
    );
    expect(String(RICH_HTML_CODE_CLASS)).toBe(String(/^language-[a-z0-9_+#-]+$/i));
    expect([...RICH_HTML_DROP_CONTENT_TAGS]).toEqual([
      'annotation-xml',
      'audio',
      'colgroup',
      'desc',
      'embed',
      'foreignobject',
      'head',
      'iframe',
      'math',
      'mi',
      'mn',
      'mo',
      'ms',
      'mtext',
      'noembed',
      'noframes',
      'noscript',
      'object',
      'option',
      'plaintext',
      'script',
      'select',
      'style',
      'svg',
      'template',
      'textarea',
      'thead',
      'title',
      'video',
      'xmp',
    ]);
  });
});
