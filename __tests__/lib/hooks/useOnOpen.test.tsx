import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOnOpen } from '@/lib/hooks/useOnOpen';

describe('useOnOpen', () => {
  it('fires on each opening and on a key change while open, not on other rerenders', () => {
    const onOpen = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen, k, n }: { isOpen: boolean; k?: string; n: number }) =>
        useOnOpen(isOpen, () => onOpen(n), k),
      { initialProps: { isOpen: false, k: undefined as string | undefined, n: 1 } }
    );
    expect(onOpen).not.toHaveBeenCalled();

    rerender({ isOpen: true, k: undefined, n: 1 });
    expect(onOpen).toHaveBeenLastCalledWith(1);
    expect(onOpen).toHaveBeenCalledTimes(1);

    rerender({ isOpen: true, k: undefined, n: 2 });
    expect(onOpen).toHaveBeenCalledTimes(1);

    rerender({ isOpen: true, k: 'b', n: 3 });
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onOpen).toHaveBeenLastCalledWith(3);

    rerender({ isOpen: false, k: 'b', n: 3 });
    rerender({ isOpen: true, k: 'b', n: 4 });
    expect(onOpen).toHaveBeenCalledTimes(3);
    expect(onOpen).toHaveBeenLastCalledWith(4);
  });

  it('fires once when the key changes while closed and the dialog then opens', () => {
    const onOpen = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen, k }: { isOpen: boolean; k: string }) => useOnOpen(isOpen, onOpen, k),
      { initialProps: { isOpen: true, k: 'a' } }
    );
    rerender({ isOpen: false, k: 'a' });
    rerender({ isOpen: false, k: 'b' });
    expect(onOpen).toHaveBeenCalledTimes(1);

    rerender({ isOpen: true, k: 'b' });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });
});
