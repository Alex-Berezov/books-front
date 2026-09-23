import { describe, expect, it } from 'vitest';
import { toListResult } from '@/lib/api/paginated-envelope';
import { ApiError } from '@/types/api';
import type { PaginatedResult } from '@/types/api-schema';

// `LEGACY-379`, пачка `W7`: переходник на окно выката — массив или `{items, pagination}`,
// всё остальное — ошибка, а не пустой список.
describe('toListResult', () => {
  it('сворачивает голый массив в одну страницу', () => {
    expect(toListResult(['a', 'b'])).toEqual({
      items: ['a', 'b'],
      pagination: { page: 1, limit: 2, total: 2, totalPages: 1 },
    });
  });

  it('пустой массив — ноль страниц, как у paginatedAll на бэкенде', () => {
    expect(toListResult([])).toEqual({
      items: [],
      pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
    });
  });

  it('целевую форму отдаёт как есть', () => {
    const body: PaginatedResult<string> = {
      items: ['x'],
      pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
    };
    expect(toListResult(body)).toBe(body);
  });

  it.each([
    ['null', null],
    ['{data, meta}', { data: ['x'], meta: { page: 1, limit: 1, total: 1, totalPages: 1 } }],
    ['items без pagination', { items: ['x'] }],
    ['pagination без items', { pagination: { page: 1, limit: 1, total: 1, totalPages: 1 } }],
  ])('третья форма (%s) — ошибка, а не пустой список', (_label, body) => {
    expect(() => toListResult(body as unknown as string[])).toThrow(
      'Unexpected list response shape'
    );
    // 5xx `ApiError` — иначе глобальный тост в `AppProviders` отказ не покажет.
    expect(() => toListResult(body as unknown as string[])).toThrow(
      expect.objectContaining({ statusCode: 502 })
    );
    expect(() => toListResult(body as unknown as string[])).toThrow(ApiError);
  });
});
