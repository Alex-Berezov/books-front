// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { describeSanitizeContract } from './richHtmlCases';

/**
 * Browser branch of `sanitizeRichHtml` (DOMPurify): the one that ships to
 * readers, since sanitize-html is kept out of client chunks (`LEGACY-414`,
 * arbiter decision on T27). Same cases as the Node branch.
 */
describe('sanitizeRichHtml, browser branch', () => {
  it('runs with a window, so the DOMPurify branch is taken', () => {
    expect(typeof window).toBe('object');
  });

  describeSanitizeContract();
});
