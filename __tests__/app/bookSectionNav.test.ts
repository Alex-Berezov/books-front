import { describe, expect, it } from 'vitest';
import { buildBookSectionNavItems } from '@/app/[lang]/book/[slug]/BookSectionNav';

const labels = {
  book: 'Book',
  read: 'Read',
  listen: 'Listen',
  summary: 'Summary',
  analysis: 'Analysis',
  world: 'Book world',
};

const build = (hasWorld: boolean, hasAnalysis = true) =>
  buildBookSectionNavItems({
    lang: 'en',
    bookSlug: 'dracula',
    hasText: true,
    hasAudio: false,
    hasSummary: true,
    hasAnalysis,
    hasWorld,
    labels,
  });

describe('навигация по разделам книги: мир книги (F08-3, Q7)', () => {
  it('пункт «Мир книги» есть при hasWorld и ведёт на /{lang}/book/{slug}/wiki', () => {
    const world = build(true).find((item) => item.key === 'world');

    expect(world).toEqual({ key: 'world', label: 'Book world', href: '/en/book/dracula/wiki' });
  });

  it('без hasWorld пункта нет - пустых ссылок навигация не рисует', () => {
    expect(build(false).some((item) => item.key === 'world')).toBe(false);
  });

  it('пункт стоит после анализа, а остальные пункты не меняются от флага', () => {
    const keys = build(true).map((item) => item.key);

    expect(keys).toEqual(['book', 'read', 'summary', 'analysis', 'world']);
    expect(build(false).map((item) => item.key)).toEqual(['book', 'read', 'summary', 'analysis']);
  });

  it('мир книги не зависит от анализа', () => {
    expect(build(true, false).map((item) => item.key)).toEqual([
      'book',
      'read',
      'summary',
      'world',
    ]);
  });
});
