import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateBookModal } from '@/components/admin/books/CreateBookModal/useCreateBookModal';

const mocks = vi.hoisted(() => ({
  checkBookSlugUniqueness: vi.fn(),
  push: vi.fn(),
  enqueueSnackbar: vi.fn(),
}));

vi.mock('@/api/endpoints/slug-validation', () => ({
  checkBookSlugUniqueness: mocks.checkBookSlugUniqueness,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }),
}));

const renderModalHook = () =>
  renderHook(() => useCreateBookModal({ isOpen: true, onClose: vi.fn(), lang: 'en' }));

/**
 * LEGACY-142. Форма создания книги читает результат проверки слага напрямую,
 * минуя `useSlugValidation`. Отказ проверки отвечает «не знаю», и предикат
 * обязан сравнивать строго с `false`: `!result.isUnique` на неизвестности
 * объявил бы слаг занятым и подставил бы вместо него `suggestedSlug`, которого
 * при отказе нет вовсе.
 */
describe('useCreateBookModal - slug check that could not answer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the generated slug and reports no error when the check fails', async () => {
    mocks.checkBookSlugUniqueness.mockResolvedValue({ slug: 'dune', checkFailed: true });

    const { result } = renderModalHook();

    act(() => {
      result.current.handleInputChange('title')({
        target: { value: 'Dune' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      expect(result.current.finalSlug).toBe('dune');
    });

    expect(result.current.slugError).toBeNull();
  });

  it('still swaps in the suggestion when the check confirms the slug is taken', async () => {
    mocks.checkBookSlugUniqueness.mockResolvedValue({
      slug: 'dune',
      isUnique: false,
      suggestedSlug: 'dune-2',
    });

    const { result } = renderModalHook();

    act(() => {
      result.current.handleInputChange('title')({
        target: { value: 'Dune' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      expect(result.current.finalSlug).toBe('dune-2');
    });

    expect(result.current.slugError).toMatch(/already taken/i);
  });
});
