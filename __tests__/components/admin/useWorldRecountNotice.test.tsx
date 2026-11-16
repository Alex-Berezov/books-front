import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorldRecountNotice } from '@/components/admin/books/WorldTab/useWorldRecountNotice';
import type { BookWorldEntity } from '@/types/api-schema';
import { detail } from '../../helpers/worldApi';

/**
 * F08-2, решения арбитра `F08 | F08-2` S5, S6: метку держит `editor.recountPending` — у версии
 * стоит пересчёт, кто бы его ни поставил; «Saved» — только после записи этой карточки
 * с `recountQueued`. Когда строки очереди больше нет, метка забывает сохранение.
 */

const withPending = (recountPending: boolean): BookWorldEntity => {
  const base = detail('sonya').entity;
  return { ...base, editor: { ...base.editor!, recountPending } };
};

let client = new QueryClient();
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);
beforeEach(() => {
  client = new QueryClient();
});
const ok = () => vi.fn().mockResolvedValue({ isError: false, error: null });

describe('useWorldRecountNotice (S5, S6)', () => {
  it('own save that queued — «saved»; queue empty — nothing; a later queued recount — «queued»', async () => {
    const { result, rerender } = renderHook(
      ({ entity }: { entity: BookWorldEntity }) => useWorldRecountNotice('v1', entity, ok()),
      { wrapper, initialProps: { entity: withPending(false) } }
    );
    expect(result.current.notice).toBeNull();
    // Запись кладёт в кэш сущность из ответа (строка очереди есть), затем зовёт onSaved.
    rerender({ entity: withPending(true) });
    act(() => result.current.onSaved(true));
    expect(result.current.notice).toBe('saved');

    rerender({ entity: withPending(false) });
    expect(result.current.notice).toBeNull();
    // Строку очереди поставила правка главы или импорт всей версии, а не эта карточка.
    rerender({ entity: withPending(true) });
    await waitFor(() => expect(result.current.notice).toBe('queued'));
  });

  it('a card reopened after its first save that queued keeps «saved» (new entity, S6)', () => {
    const { result } = renderHook(
      () => useWorldRecountNotice('v1', withPending(true), ok(), true),
      { wrapper }
    );
    expect(result.current.notice).toBe('saved');
  });

  it('a second save that did not queue keeps «saved» while the same recount is pending', () => {
    const { result } = renderHook(() => useWorldRecountNotice('v1', withPending(true), ok()), {
      wrapper,
    });
    act(() => result.current.onSaved(true));
    act(() => result.current.onSaved(false));
    expect(result.current.notice).toBe('saved');
  });

  it('a save that did not queue while the server holds a recount shows «queued», not «saved»', () => {
    const { result } = renderHook(() => useWorldRecountNotice('v1', withPending(true), ok()), {
      wrapper,
    });
    act(() => result.current.onSaved(false));
    expect(result.current.notice).toBe('queued');
  });

  it('a failed Reload says why; the next successful Reload clears it', async () => {
    const refetch = vi
      .fn()
      .mockResolvedValueOnce({ isError: true, error: new Error('down') })
      .mockResolvedValueOnce({ isError: false, error: null });
    const { result } = renderHook(() => useWorldRecountNotice('v1', withPending(true), refetch), {
      wrapper,
    });
    await act(() => result.current.reload());
    expect(result.current.reloadError).not.toBeNull();
    await act(() => result.current.reload());
    expect(result.current.reloadError).toBeNull();
  });
});
