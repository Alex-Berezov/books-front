import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookSummary } from '@/api/endpoints/admin/bookSummaries';

/**
 * Пересказ версии для вкладки Summary. Пересказа нет - сервер отвечает 200 с пустым телом,
 * клиент (`lib/http.ts`) отдаёт `undefined`; ручка обязана вернуть `null`, иначе react-query 5
 * считает запрос отказом (сообщение владельца 20.10.2026). Черновик видит только редактор -
 * запрос идёт с `optionalAuth` (`LEGACY-090`).
 */

const http = vi.hoisted(() => ({
  httpGetAuth: vi.fn(),
  httpPostAuth: vi.fn(),
  httpPutAuth: vi.fn(),
}));
vi.mock('@/lib/http-client', () => http);

describe('getBookSummary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('пересказа нет: null, а не undefined', async () => {
    http.httpGetAuth.mockResolvedValue(undefined);
    await expect(getBookSummary('v1')).resolves.toBeNull();
  });

  it('пересказ есть: отдаётся как есть, запрос с optionalAuth', async () => {
    const stored = { id: 's1', summary: '<p>Plot.</p>' };
    http.httpGetAuth.mockResolvedValue(stored);
    await expect(getBookSummary('v1')).resolves.toBe(stored);
    expect(http.httpGetAuth).toHaveBeenCalledWith('/versions/v1/summary', { optionalAuth: true });
  });
});
