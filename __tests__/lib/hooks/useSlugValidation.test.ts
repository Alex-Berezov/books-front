import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSlugValidation } from '@/lib/hooks/useSlugValidation';

const mocks = vi.hoisted(() => ({ httpGetAuth: vi.fn() }));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/http-client');
  return { ...actual, httpGetAuth: mocks.httpGetAuth };
});

/**
 * LEGACY-142. `useSlugValidation` пробрасывает `checkFailed` от эндпоинта как
 * статус `'unknown'`, а не `'valid'`: отказ проверки не должен читаться формой
 * как подтверждённая уникальность.
 */
describe('useSlugValidation - failed check reports status "unknown"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets status to "unknown" and leaves isUnique unset when the endpoint fails', async () => {
    mocks.httpGetAuth.mockRejectedValue(new Error('network'));

    const { result } = renderHook(() => useSlugValidation({ entityType: 'tag', debounceMs: 0 }));

    act(() => {
      result.current.validate('some-slug');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('unknown');
    });

    expect(result.current.isUnique).not.toBe(true);
  });

  // Вторая ветка того же правила: отказ случается до вызова эндпоинта, в самом
  // хуке (страница без языка бросает синхронно). Её собственный `catch` раньше
  // тоже ставил 'valid'.
  it('sets status to "unknown" when it fails before the request goes out', async () => {
    const { result } = renderHook(() => useSlugValidation({ entityType: 'page', debounceMs: 0 }));

    act(() => {
      result.current.validate('some-slug');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('unknown');
    });

    expect(mocks.httpGetAuth).not.toHaveBeenCalled();
    expect(result.current.isUnique).not.toBe(true);
  });

  it('still reaches "valid" when the check actually succeeds', async () => {
    mocks.httpGetAuth.mockResolvedValue({ exists: false });

    const { result } = renderHook(() => useSlugValidation({ entityType: 'tag', debounceMs: 0 }));

    act(() => {
      result.current.validate('free-slug');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('valid');
    });

    expect(result.current.isUnique).toBe(true);
  });
});
