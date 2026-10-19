import { describe, expect, it } from 'vitest';
import { buildAnalysisSectionLinks } from '@/app/[lang]/book/[slug]/analysis/analysisAnchors';

/** Ссылки «Разбор» со страницы книги (F03-3, `product.md` §22): только на разделы, которые есть. */
describe('buildAnalysisSectionLinks', () => {
  it('есть раздел - ссылка на его якорь, нет - null', () => {
    expect(
      buildAnalysisSectionLinks('/en/book/hamlet/analysis', {
        characters: true,
        symbols: false,
        keyQuotes: true,
      })
    ).toEqual({
      characters: '/en/book/hamlet/analysis#characters',
      symbols: null,
      quotes: '/en/book/hamlet/analysis#key-quotes',
    });
  });
});
