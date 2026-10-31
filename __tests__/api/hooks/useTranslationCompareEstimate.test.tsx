import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTranslationCompareEstimate } from '@/api/hooks/useTranslationCompare';

/** T151: оценка сравнения выключает старт по отказу досье - кэш клиента её не держит. */

const api = vi.hoisted(() => ({
  getTranslationCompare: vi.fn(),
  getTranslationCompareEstimate: vi.fn(),
  getTranslationCompares: vi.fn(),
  startTranslationCompare: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/translation', () => api);
vi.mock('@/api/endpoints/admin/llm', () => ({
  cancelLlmOperation: vi.fn(),
  resumeLlmOperation: vi.fn(),
  LLM_MODELS_UNAVAILABLE: 'X',
}));

describe('useTranslationCompareEstimate', () => {
  it('a new window asks a fresh estimate despite the client cache (T151)', async () => {
    // Как `AppProviders`: умолчание клиента держит данные свежими минуту.
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    api.getTranslationCompareEstimate.mockResolvedValue({ chunks: 1 });
    const params = { chapterNumber: 1, targetLanguage: 'es', models: ['a/one', 'b/two'] };

    const first = renderHook(() => useTranslationCompareEstimate('v1', params), { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    first.unmount();
    const second = renderHook(() => useTranslationCompareEstimate('v1', params), { wrapper });
    await waitFor(() => expect(api.getTranslationCompareEstimate).toHaveBeenCalledTimes(2));
    second.unmount();
  });
});
