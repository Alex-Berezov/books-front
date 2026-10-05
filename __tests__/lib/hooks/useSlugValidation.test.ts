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

/**
 * Слаг языковой версии уникален в пределах языка, поэтому проверка зависит от языка формы:
 * без языка она не отвечает вовсе, а ответ по прежнему языку не перетирает ответ по текущему.
 */
describe('useSlugValidation - book version slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the version check with the language and the edited version id', async () => {
    mocks.httpGetAuth.mockResolvedValue({ exists: false });

    const { result } = renderHook(() =>
      useSlugValidation({
        entityType: 'bookVersion',
        lang: 'ru',
        excludeId: 'version-1',
        ownBookId: 'book-1',
        debounceMs: 0,
      })
    );

    act(() => {
      result.current.validate('voyna-i-mir');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('valid');
    });
    const endpoint = mocks.httpGetAuth.mock.calls[0][0] as string;
    expect(endpoint).toContain('/books/check-slug');
    expect(endpoint).toContain('lang=ru');
    expect(endpoint).toContain('excludeVersionId=version-1');
    expect(endpoint).toContain('excludeId=book-1');
  });

  it('reports "unknown" without a request when the language is missing', async () => {
    const { result } = renderHook(() =>
      useSlugValidation({ entityType: 'bookVersion', debounceMs: 0 })
    );

    act(() => {
      result.current.validate('voyna-i-mir');
    });

    await waitFor(() => {
      expect(result.current.status).toBe('unknown');
    });
    expect(mocks.httpGetAuth).not.toHaveBeenCalled();
  });

  it('ignores a late answer for the previous language', async () => {
    let answerForEn: (value: unknown) => void = () => undefined;
    mocks.httpGetAuth
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            answerForEn = resolve;
          })
      )
      .mockResolvedValueOnce({ exists: false });

    const { result, rerender } = renderHook(
      ({ lang }: { lang: 'en' | 'fr' }) =>
        useSlugValidation({ entityType: 'bookVersion', lang, debounceMs: 0 }),
      { initialProps: { lang: 'en' as 'en' | 'fr' } }
    );

    act(() => {
      result.current.validate('hamlet');
    });
    await waitFor(() => expect(mocks.httpGetAuth).toHaveBeenCalledTimes(1));

    rerender({ lang: 'fr' });
    act(() => {
      result.current.validate('hamlet');
    });
    await waitFor(() => expect(result.current.status).toBe('valid'));

    await act(async () => {
      answerForEn({ exists: true, suggestedSlug: 'hamlet-2' });
    });

    expect(result.current.status).toBe('valid');
    expect(mocks.httpGetAuth.mock.calls[1][0] as string).toContain('lang=fr');
  });
});
