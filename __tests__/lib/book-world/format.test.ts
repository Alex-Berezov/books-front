import { describe, expect, it } from 'vitest';
import {
  fillTemplate,
  isLastThirdChapter,
  presenceChapters,
  rankCoPresence,
  updatedAtRange,
} from '@/lib/book-world/format';

describe('rankCoPresence: «чаще всего в одних главах с» и «Дальше» (решение арбитра Q9)', () => {
  const all = new Set(['a', 'b', 'c', 'd', 'e']);

  it('больше общих глав - выше, при равенстве - по ключу', () => {
    const ranked = rankCoPresence(
      [
        { key: 'c', chapters: [1, 2] },
        { key: 'a', chapters: [1] },
        { key: 'b', chapters: [1, 2] },
        { key: 'd', chapters: [1, 2, 3] },
      ],
      all,
      'self'
    );
    expect(ranked.map((r) => r.key)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('не публичные, сам герой и герои без общих глав не попадают', () => {
    const ranked = rankCoPresence(
      [
        { key: 'a', chapters: [1] },
        { key: 'hidden', chapters: [1, 2, 3] },
        { key: 'self', chapters: [1] },
        { key: 'b', chapters: [] },
      ],
      all,
      'self'
    );
    expect(ranked.map((r) => r.key)).toEqual(['a']);
  });

  it('не мутирует вход и терпит null', () => {
    const input = [
      { key: 'b', chapters: [1] },
      { key: 'a', chapters: [1] },
    ];
    rankCoPresence(input, all, 'x');
    expect(input.map((r) => r.key)).toEqual(['b', 'a']);
    expect(rankCoPresence(null, all, 'x')).toEqual([]);
  });
});

describe('isLastThirdChapter: пометка «спойлер»', () => {
  const nine = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  it('последняя треть - спойлер, граница 6/9 - ещё нет', () => {
    expect(nine.filter((n) => isLastThirdChapter(n, nine))).toEqual([7, 8, 9]);
  });

  it('считается по положению в версии, а не по номеру', () => {
    expect(isLastThirdChapter(30, [10, 20, 30])).toBe(true);
    expect(isLastThirdChapter(10, [10, 20, 30])).toBe(false);
  });

  it('главы нет в версии или версия без глав - пометки нет', () => {
    expect(isLastThirdChapter(99, nine)).toBe(false);
    expect(isLastThirdChapter(1, [])).toBe(false);
  });
});

describe('presenceChapters и даты', () => {
  it('оставляет только главы версии, без повторов, по возрастанию', () => {
    expect(presenceChapters([9, 3, 3, 1], [1, 2, 3])).toEqual([1, 3]);
    expect(presenceChapters(null, [1])).toEqual([]);
    expect(presenceChapters([1], [])).toEqual([]);
  });

  it('максимальный и ранний updatedAt, неразборчивые даты пропускаются', () => {
    const dates = ['2026-11-02T10:00:00.000Z', 'oops', '2026-11-05T10:00:00.000Z'];
    expect(updatedAtRange(dates)).toEqual({
      earliest: '2026-11-02T10:00:00.000Z',
      latest: '2026-11-05T10:00:00.000Z',
    });
    expect(updatedAtRange(['oops'])).toEqual({ earliest: null, latest: null });
    expect(updatedAtRange([])).toEqual({ earliest: null, latest: null });
  });
});

describe('fillTemplate: подстановка в шаблон строки', () => {
  it('вставляет значение как есть: `$&` и `$1` из имени не разбираются', () => {
    expect(fillTemplate('{name} — {title}', { name: 'Tom $& Co', title: 'Book $1' })).toBe(
      'Tom $& Co — Book $1'
    );
    expect(fillTemplate('Chapter {n}', { n: 3 })).toBe('Chapter 3');
  });
});
