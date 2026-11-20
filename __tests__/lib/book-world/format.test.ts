import { describe, expect, it } from 'vitest';
import {
  fillTemplate,
  pickBookHeroes,
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

describe('pickBookHeroes (F08-5, Q4)', () => {
  const h = (
    key: string,
    role: string | null,
    mentionFirst: number | null,
    type = 'character'
  ) => ({
    key,
    type,
    hasCore: true,
    role,
    mentionFirst,
  });

  it('main первыми, затем по первой главе (пустые в конце), затем по ключу', () => {
    const list = [
      h('d', null, null),
      h('c', null, 1),
      h('b', 'main', 5),
      h('a', 'main', 5),
      h('e', null, 1),
    ];
    expect(pickBookHeroes(list).map((e) => e.key)).toEqual(['a', 'b', 'c', 'e', 'd']);
  });

  it('только герои со страницей и не больше шести', () => {
    const list = [
      ...Array.from({ length: 8 }, (_, i) => h(`k${i}`, null, i)),
      h('place', null, 0, 'place'),
      { ...h('nocore', 'main', 0), hasCore: false },
    ];
    const picked = pickBookHeroes(list).map((e) => e.key);
    expect(picked).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5']);
  });

  it('пара героев в блок «Герои книги» не попадает (F08-8c)', () => {
    const list = [h('a', 'main', 1), h('a--b', null, 1, 'pair'), h('b', null, 2)];
    expect(pickBookHeroes(list).map((e) => e.key)).toEqual(['a', 'b']);
  });

  it('строка редактора в блок не попадает (как и в ссылки текста)', () => {
    expect(
      pickBookHeroes([{ ...h('ed', 'main', 1), editor: {} }, h('ok', null, 2)]).map((e) => e.key)
    ).toEqual(['ok']);
  });
});
