import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBookSummary } from '@/api/hooks/useBookSummary';

/**
 * Версия без пересказа: `GET /versions/:id/summary` отвечает `200` с пустым телом, клиент
 * (`lib/http.ts`) превращает его в `undefined`. react-query 5 считает `undefined` из `queryFn`
 * отказом, и вкладка Summary показывала «Failed to load the summary» у любой версии без
 * пересказа - ввести пересказ было некуда (сообщение владельца 20.10.2026). Ручка настоящая,
 * подменён только HTTP-клиент: проверяется связка ручки с react-query.
 */

vi.mock('@/lib/http-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/http-client')>()),
  httpGetAuth: vi.fn().mockResolvedValue(undefined),
}));

describe('useBookSummary: пересказа у версии ещё нет', () => {
  it('удачная загрузка с data = null, а не ошибка', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useBookSummary('v1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isFetched).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(result.current.status).toBe('success');
    expect(result.current.data).toBeNull();
  });
});
