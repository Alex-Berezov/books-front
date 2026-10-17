/**
 * F03-1: сохранение анализа кладёт запись в кэш сразу (вкладка, смонтированная заново до
 * перечитывания, не заполнится старыми данными), а проба (`dryRun`) кэш не трогает.
 */

import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { analysisKeys, useSaveBookAnalysis } from '@/api/hooks/useBookAnalysis';

const saved = { language: 'en', hasCore: true, mainIdea: 'New' };

vi.mock('@/api/endpoints/admin/bookAnalyses', () => ({
  getBookAnalysis: vi.fn(),
  getChapterTitles: vi.fn(),
  saveBookAnalysis: vi.fn(async (_id: string, _data: unknown, dryRun?: boolean) => ({
    analysis: dryRun ? null : saved,
    hasCore: true,
    warnings: [],
  })),
}));

const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(analysisKeys.detail('v1'), { mainIdea: 'Old' });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useSaveBookAnalysis(), { wrapper });
  return { client, invalidate, result };
};

describe('useSaveBookAnalysis', () => {
  it('сохранение: запись в кэше сразу, затем перечитывание', async () => {
    const { client, invalidate, result } = setup();
    await act(() => result.current.mutateAsync({ versionId: 'v1', data: { language: 'en' } }));
    expect(client.getQueryData(analysisKeys.detail('v1'))).toEqual(saved);
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: analysisKeys.detail('v1') });
  });

  it('проба: кэш не тронут и не сбрасывается', async () => {
    const { client, invalidate, result } = setup();
    await act(() =>
      result.current.mutateAsync({ versionId: 'v1', data: { language: 'en' }, dryRun: true })
    );
    expect(client.getQueryData(analysisKeys.detail('v1'))).toEqual({ mainIdea: 'Old' });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
