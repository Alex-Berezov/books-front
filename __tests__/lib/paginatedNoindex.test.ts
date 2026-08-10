import { describe, expect, it } from 'vitest';
import { shouldNoindexPaginatedPage } from '@/lib/utils/seo-indexing';

/**
 * Правило `noindex` для страниц пагинации. До 10.08.2026 не было покрыто ни
 * одним тестом, хотя решает индексируемость каждой второй и далее страницы
 * каталога, таксономий и тегов.
 *
 * ⚠️ Ошибка здесь несимметрична: лишний `noindex` выбрасывает живую страницу из
 * индекса на недели, лишний `index` добавляет пустую — поэтому проверяются обе
 * границы, а не только «нормальный» случай.
 */
describe('shouldNoindexPaginatedPage', () => {
  const PAGE_SIZE = 20;

  // Первая страница — сама витрина, она индексируется всегда.
  it('никогда не закрывает первую страницу', () => {
    expect(shouldNoindexPaginatedPage(1, 0, PAGE_SIZE)).toBe(false);
    expect(shouldNoindexPaginatedPage(1, 1000, PAGE_SIZE)).toBe(false);
    // Запрос со страницей 0 или отрицательной — тоже первая витрина.
    expect(shouldNoindexPaginatedPage(0, 100, PAGE_SIZE)).toBe(false);
  });

  // 🔴 Пустая выдача на второй странице — это адрес без содержимого.
  it('закрывает вторую страницу пустой выдачи', () => {
    expect(shouldNoindexPaginatedPage(2, 0, PAGE_SIZE)).toBe(true);
  });

  it('оставляет открытой страницу внутри диапазона', () => {
    // 45 элементов при размере 20 — три страницы.
    expect(shouldNoindexPaginatedPage(2, 45, PAGE_SIZE)).toBe(false);
    expect(shouldNoindexPaginatedPage(3, 45, PAGE_SIZE)).toBe(false);
  });

  // 🔴 Граница: последняя существующая страница обязана остаться открытой,
  // первая несуществующая — закрыться. Ошибка на единицу здесь стоит либо
  // выпавшей из индекса живой страницы, либо проиндексированной пустой.
  it('различает последнюю существующую страницу и первую лишнюю', () => {
    expect(shouldNoindexPaginatedPage(3, 45, PAGE_SIZE)).toBe(false);
    expect(shouldNoindexPaginatedPage(4, 45, PAGE_SIZE)).toBe(true);
  });

  it('закрывает страницу далеко за пределами выдачи', () => {
    expect(shouldNoindexPaginatedPage(99, 45, PAGE_SIZE)).toBe(true);
  });

  // Ровное деление — отдельный случай: 40 элементов дают ровно две страницы.
  it('не закрывает последнюю страницу при ровном делении', () => {
    expect(shouldNoindexPaginatedPage(2, 40, PAGE_SIZE)).toBe(false);
    expect(shouldNoindexPaginatedPage(3, 40, PAGE_SIZE)).toBe(true);
  });
});
