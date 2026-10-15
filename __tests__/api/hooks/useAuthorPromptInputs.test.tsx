import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { authorKeys, useAuthorPromptInputs } from '@/api/hooks/useAuthors';

// F02-2: «Вводные для промпта» берутся только по кнопке и каждый раз свежими.

const { getSpy } = vi.hoisted(() => ({ getSpy: vi.fn() }));

vi.mock('@/api/endpoints/admin/authors', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/endpoints/admin/authors')>()),
  getAuthorPromptInputs: (id: string) => getSpy(id),
}));

const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

describe('useAuthorPromptInputs', () => {
  it('не грузит при монтировании (enabled: false), грузит по refetch и не держит кэш (staleTime: 0)', async () => {
    getSpy.mockResolvedValue({ id: 'a1', authorsTruncated: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useAuthorPromptInputs('a1'), {
      wrapper: wrapperFor(client),
    });

    expect(getSpy).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.refetch();
    });
    await act(async () => {
      await result.current.refetch();
    });

    expect(getSpy).toHaveBeenCalledTimes(2);
    expect(getSpy).toHaveBeenCalledWith('a1');
    const query = client.getQueryCache().find({ queryKey: authorKeys.promptInputs('a1') });
    expect(query?.options).toMatchObject({ enabled: false, staleTime: 0 });
  });
});
