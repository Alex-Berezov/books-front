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

const typeName = (result: { current: ReturnType<typeof useCreateAuthorModal> }, value: string) => {
  act(() => {
    result.current.handleInputChange('name')({
      target: { value },
    } as React.ChangeEvent<HTMLInputElement>);
  });
};

/**
 * LEGACY-370. Проверка слага отвечает тремя исходами, и форма показывает каждый:
 * занятый слаг ветвится по `exists` и берёт `suggestedSlug`, отказ проверки не выдаётся
 * за «свободен», ответ по прежнему имени не перетирает актуальный слаг.
 */
describe('useCreateAuthorModal shows the slug check result (LEGACY-370)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const render = () =>
    renderHook(() => useCreateAuthorModal({ isOpen: true, onClose: vi.fn(), lang: 'en' }));

  it('takes the suggested slug when the slug is taken', async () => {
    mocks.checkAuthorSlug.mockResolvedValue({
      exists: true,
      suggestedSlug: 'leo-tolstoy-2',
      existingAuthor: { id: 'a1', slug: 'leo-tolstoy' },
    });
    const { result } = render();

    typeName(result, 'Leo Tolstoy');

    await waitFor(() => expect(result.current.isValidatingSlug).toBe(false));
    expect(result.current.finalSlug).toBe('leo-tolstoy-2');
    expect(result.current.slugError).toBe('Slug "leo-tolstoy" is already taken');
    expect(result.current.slugCheckFailed).toBe(false);
  });

  it('never submits a taken slug when no suggestion came back', async () => {
    mocks.checkAuthorSlug.mockResolvedValue({ exists: true });
    const { result } = render();

    typeName(result, 'Leo Tolstoy');
    await waitFor(() => expect(result.current.isValidatingSlug).toBe(false));
    expect(result.current.finalSlug).toBe('');

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(mocks.createAuthor).not.toHaveBeenCalled();
    expect(result.current.errors.name).toBe('Slug "leo-tolstoy" is already taken');
  });

  it('reports a failed check instead of calling the slug free', async () => {
    mocks.checkAuthorSlug.mockRejectedValue(new Error('401'));
    const { result } = render();

    typeName(result, 'Leo Tolstoy');

    await waitFor(() => expect(result.current.isValidatingSlug).toBe(false));
    expect(result.current.slugCheckFailed).toBe(true);
    expect(result.current.slugError).toBeNull();
    expect(result.current.finalSlug).toBe('leo-tolstoy');
  });

  it('ignores a late answer for the previous name', async () => {
    let resolveOld: (value: unknown) => void = () => undefined;
    mocks.checkAuthorSlug.mockImplementation((slug: string) =>
      slug === 'leo'
        ? new Promise((resolve) => {
            resolveOld = resolve;
          })
        : Promise.resolve({ exists: false })
    );
    const { result } = render();

    typeName(result, 'Leo');
    await waitFor(() => expect(mocks.checkAuthorSlug).toHaveBeenCalledWith('leo', 'en'));

    typeName(result, 'Leo Tolstoy');
    await waitFor(() => expect(result.current.finalSlug).toBe('leo-tolstoy'));

    await act(async () => {
      resolveOld({ exists: true, suggestedSlug: 'leo-2' });
      await Promise.resolve();
    });

    expect(result.current.finalSlug).toBe('leo-tolstoy');
    expect(result.current.slugError).toBeNull();
    expect(result.current.isValidatingSlug).toBe(false);
  });

  it('does not keep the previous slug when the new name gives no slug', async () => {
    mocks.checkAuthorSlug.mockResolvedValue({ exists: false });
    const { result } = render();

    typeName(result, 'Leo');
    await waitFor(() => expect(result.current.finalSlug).toBe('leo'));

    typeName(result, '!!!');
    await waitFor(() => expect(result.current.finalSlug).toBe(''));

    await act(async () => {
      await result.current.handleConfirm();
    });

    expect(mocks.createAuthor).not.toHaveBeenCalled();
  });

  it('drops the previous slug as soon as the name changes', async () => {
    mocks.checkAuthorSlug.mockResolvedValue({ exists: false });
    const { result } = render();

    typeName(result, 'Leo');
    await waitFor(() => expect(result.current.finalSlug).toBe('leo'));

    typeName(result, 'Leo Tolstoy');

    expect(result.current.finalSlug).toBe('');
    expect(result.current.canSubmit).toBe(false);
  });
});
