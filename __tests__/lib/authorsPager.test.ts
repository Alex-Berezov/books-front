import { describe, expect, it } from 'vitest';
import { buildPageList } from '@/components/public/authors/AuthorsPager';

/**
 * Номера страниц решают, какие ссылки попадут в серверный HTML. Ошибка на
 * границе окна молча выкидывает ссылку на существующую страницу, и заметить
 * это можно только просмотром вёрстки на настоящих данных.
 */
describe('buildPageList', () => {
  it('lists every page while they fit without a gap', () => {
    expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps first and last and opens one gap at the start', () => {
    expect(buildPageList(20, 20)).toEqual([1, 'gap', 18, 19, 20]);
  });

  it('keeps first and last and opens one gap at the end', () => {
    expect(buildPageList(1, 20)).toEqual([1, 2, 3, 'gap', 20]);
  });

  it('opens gaps on both sides in the middle of a long range', () => {
    expect(buildPageList(10, 20)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 20]);
  });

  it('never repeats a page number', () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        const numbers = buildPageList(page, total).filter(
          (entry): entry is number => entry !== 'gap'
        );
        expect(new Set(numbers).size).toBe(numbers.length);
      }
    }
  });

  it('always keeps the current page, the first and the last', () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        const numbers = buildPageList(page, total);
        expect(numbers).toContain(page);
        expect(numbers).toContain(1);
        expect(numbers).toContain(total);
      }
    }
  });

  it('never lists a page outside the range', () => {
    for (let total = 1; total <= 30; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        for (const entry of buildPageList(page, total)) {
          if (entry === 'gap') continue;
          expect(entry).toBeGreaterThanOrEqual(1);
          expect(entry).toBeLessThanOrEqual(total);
        }
      }
    }
  });

  it('keeps the numbers ascending', () => {
    const numbers = buildPageList(10, 20).filter((entry): entry is number => entry !== 'gap');
    expect([...numbers].sort((a, b) => a - b)).toEqual(numbers);
  });

  // 🔴 Пропуск ровно одной страницы — это не «…», это сама страница: места
  // многоточие занимает столько же, а ссылка из серверного HTML пропадает.
  it('never puts a gap where it hides a single page', () => {
    // 5 страниц: между 3 и 5 прячется ровно одна — показываем её, не «…».
    expect(buildPageList(1, 5)).toEqual([1, 2, 3, 4, 5]);
    // 6 страниц: прячутся две (4 и 5) — тут многоточие оправдано.
    expect(buildPageList(1, 6)).toEqual([1, 2, 3, 'gap', 6]);

    for (let total = 1; total <= 30; total += 1) {
      for (let page = 1; page <= total; page += 1) {
        const list = buildPageList(page, total);
        list.forEach((entry, at) => {
          if (entry !== 'gap') return;
          const before = list[at - 1] as number;
          const after = list[at + 1] as number;
          expect(after - before).toBeGreaterThan(2);
        });
      }
    }
  });
});
