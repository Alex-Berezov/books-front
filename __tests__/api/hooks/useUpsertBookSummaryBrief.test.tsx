import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { summaryKeys, useBookSummary, useUpsertBookSummaryBrief } from '@/api/hooks';
import type { BookSummaryDetail } from '@/types/api-schema';

/**
 * Очень краткий пересказ (F04-1): ответ сохранения кладётся в кэш пересказа после отмены идущего
 * перечитывания. Иначе перечитывание, начатое «Save Summary», приходит позже и кладёт старый `brief`.
 */

const api = vi.hoisted(() => ({
  getBookSummary: vi.fn(),
  upsertBookSummary: vi.fn(),
  upsertBookSummaryBrief: vi.fn(),
  getBookSummarySections: vi.fn(),
  getBookSummarySection: vi.fn(),
  createBookSummarySection: vi.fn(),
  updateBookSummarySection: vi.fn(),
  deleteBookSummarySection: vi.fn(),
  reorderBookSummarySections: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/bookSummaries', () => api);

const summary = (brief: string | null) =>
  ({
    id: 's1',
    summary: '<p>Plot.</p>',
    hasText: true,
    brief,
    briefHasText: brief !== null,
    updatedAt: '2026-10-19T10:00:00.000Z',
  }) satisfies BookSummaryDetail;

describe('useUpsertBookSummaryBrief', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('перечитывание, начатое до сохранения, не затирает новый brief в кэше', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    let finishFetch: (value: BookSummaryDetail) => void = () => undefined;
    api.getBookSummary.mockReturnValue(new Promise((resolve) => (finishFetch = resolve)));
    // Перечитывание «Save Summary» в полёте; сохранение брифа его отменит — отказ ожидаемый.
    const inFlight = client
      .fetchQuery({
        queryKey: summaryKeys.detail('v1'),
        queryFn: () => api.getBookSummary('v1') as Promise<BookSummaryDetail>,
      })
      .catch(() => undefined);
    api.upsertBookSummaryBrief.mockResolvedValue(summary('<p>New.</p>'));

    const { result } = renderHook(() => useUpsertBookSummaryBrief(), { wrapper: Wrapper });
    await act(async () => {
      await result.current.mutateAsync({ versionId: 'v1', brief: '<p>New.</p>' });
    });
    // Старый ответ перечитывания приходит после сохранения.
    act(() => finishFetch(summary('<p>Old.</p>')));
    await waitFor(() =>
      expect(client.getQueryData<BookSummaryDetail>(summaryKeys.detail('v1'))?.brief).toBe(
        '<p>New.</p>'
      )
    );
    await inFlight;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(client.getQueryData<BookSummaryDetail>(summaryKeys.detail('v1'))?.brief).toBe(
      '<p>New.</p>'
    );
  });

  it('после сохранения — свежее перечитывание: ответ брифа мог нести старый полный пересказ', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    api.getBookSummary.mockResolvedValue({
      ...summary('<p>New.</p>'),
      summary: '<p>Fresh plot.</p>',
    });
    const { result } = renderHook(
      () => ({ query: useBookSummary('v1'), save: useUpsertBookSummaryBrief() }),
      { wrapper: Wrapper }
    );
    await waitFor(() => expect(api.getBookSummary).toHaveBeenCalledTimes(1));
    // Ответ брифа записан раньше «Save Summary» — в нём старый полный пересказ.
    api.upsertBookSummaryBrief.mockResolvedValue({
      ...summary('<p>New.</p>'),
      summary: '<p>Old plot.</p>',
    });
    await act(async () => {
      await result.current.save.mutateAsync({ versionId: 'v1', brief: '<p>New.</p>' });
    });
    await waitFor(() => expect(api.getBookSummary).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.query.data?.summary).toBe('<p>Fresh plot.</p>'));
  });
});
