import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorForm } from '@/components/admin/authors/AuthorForm/AuthorForm';
import type { Author } from '@/types/api-schema';

// `LEGACY-401`, `T75`: бэкенд принимает в адресах вложенного `seo` только абсолютный http(s)
// и отвечает 400 на остальное, а форма автора проверяла адрес только на сервере.

const { updateSpy, enqueueSpy } = vi.hoisted(() => ({
  updateSpy: vi.fn((_vars: unknown) => Promise.resolve({})),
  enqueueSpy: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock('notistack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('notistack')>();
  return {
    ...actual,
    useSnackbar: () => ({ enqueueSnackbar: enqueueSpy, closeSnackbar: vi.fn() }),
  };
});

vi.mock('@/api/hooks/useAuthors', () => ({
  useCreateAuthor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateAuthor: () => ({ mutateAsync: updateSpy, isPending: false }),
}));

vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: () => null,
}));

const authorWith = (seo: Record<string, unknown>) =>
  ({
    id: 'a1',
    translations: [{ language: 'en', name: 'Oscar Wilde', slug: 'oscar-wilde', seo }],
  }) as unknown as Author;

const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('AuthorForm: адреса вложенного seo (LEGACY-401, T75)', () => {
  beforeEach(() => {
    updateSpy.mockClear();
    enqueueSpy.mockClear();
  });

  // Литерал, а не `SEO_URL_KEYS` компонента: иначе ключ, выпавший из списка, выпал бы и из теста.
  it.each(['canonicalUrl', 'ogImageUrl'])(
    'не отправляет перевод с негодным %s и называет поле',
    async (key) => {
      render(<AuthorForm lang="en" author={authorWith({ [key]: 'example.org/en/a' })} />);
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => expect(enqueueSpy).toHaveBeenCalled());
      expect(updateSpy).not.toHaveBeenCalled();
      expect(enqueueSpy.mock.calls[0][0]).toContain(key);
    }
  );

  it('не проверяет адрес без поля в форме — его нельзя исправить из интерфейса', async () => {
    render(<AuthorForm lang="en" author={authorWith({ eventUrl: 'example.org/e' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
  });

  it('отправляет абсолютный https как есть, пустой адрес не блокирует', async () => {
    const goodUrl = 'https://example.org/en/author/oscar-wilde';
    render(<AuthorForm lang="en" author={authorWith({ canonicalUrl: goodUrl, ogImageUrl: '' })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const sent = updateSpy.mock.calls[0][0] as {
      data: { translations: Array<{ seo?: Record<string, unknown> }> };
    };
    expect(sent.data.translations[0].seo).toMatchObject({ canonicalUrl: goodUrl });
    expect(sent.data.translations[0].seo).not.toHaveProperty('ogImageUrl');
  });

  // 🔴 `LEGACY-447`: ссылки перевода уходят в `href` публичной страницы автора; бэкенд
  // отбивает не `http(s)` 400, форма называет поле до запроса.
  it.each(['wikidataUrl', 'wikipediaUrl', 'photoUrl'])(
    'не отправляет перевод с javascript: в %s',
    async (key) => {
      const author = {
        id: 'a1',
        translations: [
          {
            language: 'en',
            name: 'Oscar Wilde',
            slug: 'oscar-wilde',
            [key]: 'javascript:alert(1)',
          },
        ],
      } as unknown as Author;
      render(<AuthorForm lang="en" author={author} />);
      fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

      await waitFor(() => expect(enqueueSpy).toHaveBeenCalled());
      expect(updateSpy).not.toHaveBeenCalled();
      expect(enqueueSpy.mock.calls[0][0]).toContain(key);
    }
  );
});
