import { describe, expect, it } from 'vitest';
import {
  LIVING_AUTHOR_MAX_AGE,
  formatAuthorDate,
  formatBlockYear,
  formatLifeYears,
} from '@/lib/author/author-dates';

/** F02-3: даты страницы автора — `YYYY` и `YYYY-MM-DD` по правилам языка страницы. */
describe('formatAuthorDate', () => {
  it('YYYY — только год на всех пяти языках', () => {
    for (const lang of ['en', 'es', 'fr', 'pt', 'ru']) {
      expect(formatAuthorDate('1828', lang)).toBe('1828');
    }
  });

  it('YYYY-MM-DD — день, месяц словом и год на языке страницы', () => {
    expect(formatAuthorDate('1828-09-09', 'ru')).toMatch(/^9 сентября 1828/);
    expect(formatAuthorDate('1828-09-09', 'en')).toBe('September 9, 1828');
    expect(formatAuthorDate('1828-09-09', 'fr')).toBe('9 septembre 1828');
    expect(formatAuthorDate('1828-09-09', 'es')).toBe('9 de septiembre de 1828');
    expect(formatAuthorDate('1828-09-09', 'pt')).toBe('9 de setembro de 1828');
  });

  // 🔴 `new Date('1828-09-09')` в поясе западнее Гринвича — 8 сентября.
  it('не сдвигает день часовым поясом', () => {
    const original = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      expect(formatAuthorDate('1910-11-20', 'en')).toBe('November 20, 1910');
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });

  it('нераспознанная или несуществующая дата — null, а не выдумка', () => {
    expect(formatAuthorDate('около 1828', 'ru')).toBeNull();
    expect(formatAuthorDate('1828-02-30', 'ru')).toBeNull();
    expect(formatAuthorDate(null, 'ru')).toBeNull();
  });
});

describe('formatLifeYears', () => {
  it('обе даты — «1828 — 1910», полная дата выводится годом', () => {
    expect(formatLifeYears('1828-09-09', '1910', 'род.', 2026)).toBe('1828 — 1910');
  });

  it('без даты смерти и рождение не старше порога — «род. YYYY»', () => {
    expect(formatLifeYears('1947', null, 'род.', 2026)).toBe('род. 1947');
    expect(formatLifeYears(String(2026 - LIVING_AUTHOR_MAX_AGE), null, 'род.', 2026)).toBe(
      `род. ${2026 - LIVING_AUTHOR_MAX_AGE}`
    );
  });

  // Решение арбитра 15.10.2026, `F02 | F02-3`, Р8: древний автор живым не объявляется.
  it('без даты смерти и рождение старше порога — «YYYY — ?»', () => {
    expect(formatLifeYears('1265', null, 'род.', 2026)).toBe('1265 — ?');
  });

  // Даты до н. э. по контракту промпта не пишутся в birthDate/deathDate (`null`, год — в хронологии,
  // `prompts/author-data.md`): строка со знаком не распознаётся, годы не выдумываются.
  it('строка вне формата (знак, «BC») — не дата: годов нет', () => {
    expect(formatLifeYears('-0544', null, 'род.', 2026)).toBeNull();
    expect(formatAuthorDate('428 BC', 'en')).toBeNull();
  });

  it('известна только смерть — «? — YYYY»; ничего — null', () => {
    expect(formatLifeYears(null, '1321', 'род.', 2026)).toBe('? — 1321');
    expect(formatLifeYears(null, null, 'род.', 2026)).toBeNull();
  });
});

describe('formatBlockYear', () => {
  it('год до н. э. (отрицательный в данных) — числом с подписью, а не «-500»', () => {
    expect(formatBlockYear(-500, 'до н. э.')).toBe('500 до н. э.');
    expect(formatBlockYear(1869, 'до н. э.')).toBe('1869');
  });
});
