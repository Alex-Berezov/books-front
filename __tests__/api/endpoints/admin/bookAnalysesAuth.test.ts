import { describe, expect, it, vi } from 'vitest';
import { getBookAnalysis } from '@/api/endpoints/admin/bookAnalyses';

const mocks = vi.hoisted(() => ({ httpGetAuth: vi.fn() }));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/http-client');
  return { ...actual, httpGetAuth: mocks.httpGetAuth };
});

/**
 * F03-1: вкладка админки читает анализ только с обязательной авторизацией. С `optionalAuth`
 * сбой сессии отправил бы запрос анонимно, аноним получает `null` за анализ без ядра, и пустая
 * форма, сохранённая целиком (А4), стёрла бы черновик.
 */
describe('getBookAnalysis: авторизация обязательна', () => {
  it('зовёт httpGetAuth без optionalAuth', async () => {
    mocks.httpGetAuth.mockResolvedValue(null);
    await getBookAnalysis('v1');
    expect(mocks.httpGetAuth).toHaveBeenCalledTimes(1);
    expect(mocks.httpGetAuth.mock.calls[0]).toEqual(['/versions/v1/analysis']);
  });
});
