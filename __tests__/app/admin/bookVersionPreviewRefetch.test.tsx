import React, { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BookVersionPreviewClient } from '@/app/admin/[lang]/books/versions/[id]/preview/BookVersionPreviewClient';
import { server } from '../../msw/server';

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ accessToken: 'test-token', user: { id: 'u1' }, expires: '2099-01-01' })
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/ru/books/versions/v1/preview',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

const API_BASE = 'http://localhost:5000/api';

const chapterPage = (content: string) => ({
  items: [
    {
      id: 'c1',
      bookVersionId: 'v1',
      number: 1,
      title: 'Акт первый',
      content,
      createdAt: '2026-10-07T00:00:00Z',
    },
  ],
  meta: { page: 1, limit: 1, total: 1, totalPages: 1 },
});

/**
 * The preview lives in its own tab next to the editor. The promise is "fix the
 * chapter there, switch back, see the fix" - so the chapters and the version
 * (title, draft status) must be refetched on focus from the admin routes,
 * although the app-wide client turns focus refetch off
 * (`providers/AppProviders.tsx`).
 */
describe('Предпросмотр перечитывает главы при возврате на вкладку', () => {
  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('правка главы и публикация в редакторе видны после возврата фокуса', async () => {
    let chapterRequests = 0;
    let versionRequests = 0;
    server.use(
      http.get(`${API_BASE}/admin/versions/v1`, () => {
        versionRequests += 1;
        // Между двумя заходами на вкладку версию опубликовали в редакторе.
        return HttpResponse.json({
          id: 'v1',
          title: 'Гамлет',
          status: versionRequests === 1 ? 'draft' : 'published',
        });
      }),
      http.get(`${API_BASE}/admin/versions/v1/chapters`, () => {
        chapterRequests += 1;
        return HttpResponse.json(
          chapterPage(chapterRequests === 1 ? '<p>Опечатка</p>' : '<p>Исправлено</p>')
        );
      })
    );

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client }, children);

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />, {
      wrapper: Wrapper,
    });

    expect(await screen.findByText('Опечатка')).toBeInTheDocument();
    expect(chapterRequests).toBe(1);
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    expect(await screen.findByText('Исправлено')).toBeInTheDocument();
    expect(chapterRequests).toBe(2);
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
    expect(versionRequests).toBe(2);
  });
});
