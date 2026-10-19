import { describe, expect, it } from 'vitest';
import { analysisSectionFlags, toChapterRanges } from '@/lib/book-analysis/format';

/** Чистые помощники низа страницы анализа (F03-3, `product.md` §9, §13). */

describe('toChapterRanges', () => {
  it('подряд идущие - отрезком, одиночные - точкой; порядок и повторы входа не влияют', () => {
    expect(toChapterRanges([9, 1, 3, 8, 7, 3])).toEqual([
      { from: 1, to: 1 },
      { from: 3, to: 3 },
      { from: 7, to: 9 },
    ]);
  });

  it('две подряд - отрезок; пусто - пусто', () => {
    expect(toChapterRanges([4, 5])).toEqual([{ from: 4, to: 5 }]);
    expect(toChapterRanges([])).toEqual([]);
  });
});

describe('analysisSectionFlags: низ страницы', () => {
  const empty = {
    themes: null,
    characters: null,
    symbols: null,
    keyQuotes: null,
    titleMeaning: null,
    endingMeaning: null,
    context: null,
    timeline: null,
    style: null,
    reception: null,
    adaptations: null,
    misreadings: null,
    discussionQuestions: null,
    faq: null,
    sources: null,
  };
  const event = { year: '1600', event: 'e', kind: 'book' as const };

  it('контекст: текст или лента от трёх событий; два события без текста - раздела нет', () => {
    expect(analysisSectionFlags({ ...empty, timeline: [event, event] }).context).toBe(false);
    expect(analysisSectionFlags({ ...empty, timeline: [event, event, event] }).context).toBe(true);
    expect(analysisSectionFlags({ ...empty, context: '  text ' }).context).toBe(true);
  });

  it('пустые строки и списки - раздела нет', () => {
    const flags = analysisSectionFlags({
      ...empty,
      reception: '   ',
      discussionQuestions: ['  '],
      faq: [],
      sources: [],
    });
    expect(flags).toMatchObject({
      reception: false,
      discussion: false,
      faq: false,
      sources: false,
      style: false,
      adaptations: false,
      misreadings: false,
    });
  });

  it('FAQ, источники и приёмы только из пустых элементов - раздела нет', () => {
    const flags = analysisSectionFlags({
      ...empty,
      faq: [{ question: ' ', answer: 'a' }],
      sources: [{ title: '  ', url: 'https://example.org' }],
      style: [{ device: '', explanation: 'e' }],
    });
    expect(flags).toMatchObject({ faq: false, sources: false, style: false });
  });
});
