import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateAuthorModal } from '@/components/admin/authors/useCreateAuthorModal';

const mocks = vi.hoisted(() => ({
  checkAuthorSlug: vi.fn(),
  createAuthor: vi.fn(),
  push: vi.fn(),
  enqueueSnackbar: vi.fn(),
}));

vi.mock('@/api/endpoints/admin/authors', () => ({
  checkAuthorSlug: mocks.checkAuthorSlug,
  createAuthor: mocks.createAuthor,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }),
}));

/**
 * LEGACY-215. Слаг автора уникален в пределах языка, и проверять его надо на том языке,
 * на котором форма перевод и создаёт, — а она создаёт его на английском всегда
 * (`createAuthor` шлёт `language: 'en'` без ветвлений). `props.lang` рядом — это язык
 * админ-интерфейса, он уходит только в редирект после создания.
 *
 * Спека закрывает именно эту развязку: подставить сюда `props.lang` — правка, которая
 * выглядит естественной и молча проверяет слаг не на том языке, на котором пишет.
 */
describe('useCreateAuthorModal checks the slug in the language it actually creates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkAuthorSlug.mockResolvedValue({ exists: false });
  });

  it("asks about 'en' even when the admin UI is in another language", async () => {
    const { result } = renderHook(() =>
      useCreateAuthorModal({ isOpen: true, onClose: vi.fn(), lang: 'ru' })
    );

    act(() => {
      result.current.handleInputChange('name')({
        target: { value: 'Leo Tolstoy' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await waitFor(() => {
      expect(mocks.checkAuthorSlug).toHaveBeenCalledTimes(1);
    });

    expect(mocks.checkAuthorSlug).toHaveBeenCalledWith('leo-tolstoy', 'en');
  });
});
