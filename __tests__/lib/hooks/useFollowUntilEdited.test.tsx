import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useFollowUntilEdited } from '@/lib/hooks/useFollowUntilEdited';

const strict = ({ children }: { children: ReactNode }) => <StrictMode>{children}</StrictMode>;

describe.each([
  ['plain', undefined],
  ['StrictMode', strict],
] as const)('useFollowUntilEdited (%s)', (_mode, wrapper) => {
  const setup = () => {
    const apply = vi.fn();
    const hook = renderHook(
      ({ isActive, value }: { isActive: boolean; value: number }) =>
        useFollowUntilEdited(isActive, value, apply),
      { initialProps: { isActive: true, value: 3 }, wrapper }
    );
    return { apply, ...hook };
  };

  it('applies the value on activation and follows its changes', () => {
    const { apply, rerender } = setup();
    expect(apply).toHaveBeenLastCalledWith(3);

    rerender({ isActive: true, value: 4 });
    expect(apply).toHaveBeenLastCalledWith(4);
  });

  it('stops following after a manual edit', () => {
    const { apply, result, rerender } = setup();
    apply.mockClear();

    result.current();
    rerender({ isActive: true, value: 5 });
    expect(apply).not.toHaveBeenCalled();
  });

  it('does not apply while inactive and follows again after reactivation', () => {
    const { apply, result, rerender } = setup();
    result.current();
    rerender({ isActive: false, value: 5 });
    apply.mockClear();

    rerender({ isActive: false, value: 6 });
    expect(apply).not.toHaveBeenCalled();

    rerender({ isActive: true, value: 7 });
    expect(apply).toHaveBeenLastCalledWith(7);
  });
});
