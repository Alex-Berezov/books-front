import { describe, expect, it } from 'vitest';
import { prepareSummaryHtml } from '@/app/[lang]/book/[slug]/summary/summaryHtml';
import { buildLinkIndex, createLinkSession } from '@/lib/book-world/link-entities';
import type { BookWorldListEntity } from '@/types/api-schema';

const anna = {
  key: 'anna',
  type: 'character',
  name: 'Anna',
  forms: ['Anna'],
  hasCore: true,
  isIndexable: true,
} as unknown as BookWorldListEntity;
const make = () => createLinkSession(buildLinkIndex([anna], (k) => `/en/w/${k}`));

describe('prepareSummaryHtml: transform берёт вход RichTextContent', () => {
  it('другой вход размечается заново, а не подменяется своим', () => {
    const { transform } = prepareSummaryHtml('<h2>Old</h2><p>Anna</p>', make());
    const out = transform('<h2>New</h2><p>Anna</p>');
    expect(out).toContain('New');
    expect(out).not.toContain('Old');
    expect(out).toContain('<a href="/en/w/anna">Anna</a>');
  });

  it('тот же вход даёт те же якоря, что оглавление', () => {
    const html = '<h2>One</h2><p>a</p><h2>Two</h2><p>Anna</p>';
    const { transform, toc } = prepareSummaryHtml(html, make());
    const out = transform(html);
    for (const a of toc) expect(out).toContain(`id="${a.id}"`);
  });
});
