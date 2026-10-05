import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBookVersionLogic } from '@/app/admin/[lang]/books/versions/[id]/useBookVersionLogic';
import { useBookForm } from '@/components/admin/books/BookForm/useBookForm';
import type { BookFormData } from '@/components/admin/books';
import type { BookVersionDetail } from '@/types/api-schema';

/**
 * У каждой языковой версии свой слаг (`BookVersion.slug`). Раньше редактор версии показывал
 * и при сохранении переписывал общий `Book.slug`: слаг, сгенерированный в русской версии,
 * после сохранения появлялся в английской, французской и остальных.
 */

const mocks = vi.hoisted(() => ({
  updateVersion: vi.fn(),
  upsertSeo: vi.fn(),
  refetch: vi.fn(),
  version: undefined as unknown,
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));
vi.mock('@/api/hooks', () => ({
  useAudioChapters: () => ({ data: undefined }),
  useBookVersion: () => ({
    data: mocks.version,
    error: null,
    isLoading: false,
    refetch: mocks.refetch,
  }),
  useCreateBookVersion: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateBookVersion: () => ({ mutateAsync: mocks.updateVersion, isPending: false }),
  useUpsertVersionSeo: () => ({ mutateAsync: mocks.upsertSeo, isPending: false }),
}));

const makeVersion = (overrides: Partial<BookVersionDetail> = {}): BookVersionDetail =>
  ({
    id: 'version-ru',
    bookId: 'book-1',
    bookSlug: 'the-brothers-karamazov',
    slug: 'bratya-karamazovy',
    language: 'ru',
    title: 'Братья Карамазовы',
    author: 'Фёдор Достоевский',
    type: 'text',
    isFree: true,
    status: 'draft',
    ...overrides,
  }) as BookVersionDetail;

describe('слаг языковой версии', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.version = undefined;
    mocks.refetch.mockResolvedValue({ data: undefined });
  });

  it('форма показывает слаг версии, а не общий слаг книги', () => {
    // Данные создаются один раз: новый объект на каждом рендере сбрасывал бы форму по кругу.
    const initialData = makeVersion();
    const { result } = renderHook(() => useBookForm({ lang: 'ru', initialData }));

    expect(result.current.getValues('bookSlug')).toBe('bratya-karamazovy');
  });

  // Версия без своего слага живёт по адресу книги: поле показывает его, чтобы сохранение
  // не меняло публичный адрес побочным эффектом (решение арбитра, `decisions-log.md`).
  it('у версии без своего слага поле показывает её действующий адрес - слаг книги', () => {
    const initialData = makeVersion({ language: 'fr', slug: null });
    const { result } = renderHook(() => useBookForm({ lang: 'fr', initialData }));

    expect(result.current.getValues('bookSlug')).toBe('the-brothers-karamazov');
  });

  it('сохранение отправляет изменённый слаг в запрос версии', async () => {
    mocks.version = makeVersion();
    const { result } = renderHook(() => useBookVersionLogic('version-ru'));

    await act(async () => {
      await result.current.handleSubmit({
        bookSlug: 'bratya-karamazovy-novyy',
        language: 'ru',
        title: 'Братья Карамазовы',
        author: 'Фёдор Достоевский',
      } as BookFormData);
    });

    expect(mocks.updateVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        versionId: 'version-ru',
        data: expect.objectContaining({ slug: 'bratya-karamazovy-novyy' }),
      })
    );
    expect(mocks.updateVersion).toHaveBeenCalledTimes(1);
  });

  // Версия без своего слага: поле показывает адрес книги, и сохранение без правки слага
  // не пишет его в версию - иначе правка описания упиралась бы в чужую версию с тем же слагом.
  it.each([
    ['без своего слага (поле показывает слаг книги)', null, 'the-brothers-karamazov'],
    ['со своим слагом', 'bratya-karamazovy', 'bratya-karamazovy'],
  ])('нетронутый слаг не отправляется: версия %s', async (_case, slug, shown) => {
    mocks.version = makeVersion({ slug });
    const { result } = renderHook(() => useBookVersionLogic('version-ru'));

    await act(async () => {
      await result.current.handleSubmit({
        bookSlug: shown,
        language: 'ru',
        title: 'Братья Карамазовы',
        author: 'Фёдор Достоевский',
      } as BookFormData);
    });

    const request = mocks.updateVersion.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(request.data).not.toHaveProperty('slug');
  });
});
