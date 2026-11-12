import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { autoTextReadKeys, versionKeys } from '@/api/hooks';
import { AutoTextReadMark } from '@/components/admin/books/ContentDraft';
import type { AutoTextRead } from '@/types/api-schema';
import { server } from '../../msw/server';

/**
 * T184: отметка редактора «прочитано» на вкладках Summary и Analysis — без неё версия с текстом
 * модели не публикуется; после отметки и снятия перечитываются она сама и гейт публикации.
 */

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';
const PATH = `${API_BASE}/admin/versions/v1/drafts/summary_write/read`;
const LANDED = '2026-11-12T10:00:00.000Z';

const unread: AutoTextRead = { autoTextAt: LANDED, readAt: null, readById: null, read: false };
const read: AutoTextRead = {
  autoTextAt: LANDED,
  readAt: '2026-11-12T10:05:00.000Z',
  readById: 'admin-1',
  read: true,
};

describe('AutoTextReadMark (T184)', () => {
  let state: AutoTextRead;
  let gets: number;
  let markReply: () => Response;
  let markBodies: unknown[];

  beforeEach(() => {
    gets = 0;
    markBodies = [];
    state = unread;
    markReply = () => {
      state = read;
      return HttpResponse.json(state);
    };
    server.use(
      http.get(PATH, () => {
        gets += 1;
        return HttpResponse.json(state);
      }),
      http.post(PATH, async ({ request }) => {
        markBodies.push(await request.json());
        return markReply();
      }),
      http.delete(PATH, () => {
        state = unread;
        return new HttpResponse(null, { status: 204 });
      })
    );
  });

  /** Ход вкладки: `'r1:written'` - ход r1, его элемент записан; `undefined` - ход грузится. */
  type Run = { id: string; status: string; items: { outcome: string; regenerating: boolean }[] };
  const runOf = (stamp: string | null | undefined, status: string): Run | null | undefined => {
    if (stamp === null || stamp === undefined) return stamp;
    const [id, outcome] = stamp.split(':');
    return { id, status, items: [{ outcome, regenerating: false }] };
  };
  const renderMark = (runStamp: string | null | undefined = 'r1:written', status = 'ready') => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const ui = (stamp: string | null | undefined, runStatus = status) => (
      <QueryClientProvider client={client}>
        <AutoTextReadMark
          versionId="v1"
          lang="en"
          kind="summary_write"
          run={runOf(stamp, runStatus)}
        />
      </QueryClientProvider>
    );
    const view = render(ui(runStamp));
    return {
      client,
      invalidate,
      rerender: (stamp: string | null | undefined, runStatus = status) =>
        view.rerender(ui(stamp, runStatus)),
      view,
    };
  };

  it('shows nothing when no model text landed in the fields', async () => {
    state = { autoTextAt: null, readAt: null, readById: null, read: true };
    const { view, client } = renderMark();
    await waitFor(() =>
      expect(client.getQueryState(autoTextReadKeys.state('v1', 'summary_write'))?.status).toBe(
        'success'
      )
    );
    expect(view.container).toBeEmptyDOMElement();
  });

  it('a failed read of the mark is shown with Retry, not hidden', async () => {
    server.use(http.get(PATH, () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    renderMark();
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Failed to load the read mark'
    );
    server.use(http.get(PATH, () => HttpResponse.json(unread)));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Mark as read' })).toBeTruthy();
  });

  it('Mark as read marks the text and reloads the publication gate of the version', async () => {
    const { invalidate } = renderMark();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));

    expect(await screen.findByText(/Marked read .*: the version can be published\./)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Unmark' })).toBeTruthy();
    // Отметка - того текста, который редактор видел на вкладке.
    expect(markBodies).toEqual([{ autoTextAt: LANDED }]);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: versionKeys.publicationGate('v1') });
  });

  it('Unmark takes the mark back and reloads the publication gate', async () => {
    state = read;
    const { invalidate } = renderMark();
    fireEvent.click(await screen.findByRole('button', { name: 'Unmark' }));
    expect(await screen.findByRole('button', { name: 'Mark as read' })).toBeTruthy();
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: versionKeys.publicationGate('v1') });
  });

  it('a refused Unmark is shown, not swallowed', async () => {
    state = read;
    server.use(
      http.delete(PATH, () =>
        HttpResponse.json({ statusCode: 404, message: 'gone' }, { status: 404 })
      )
    );
    renderMark();
    fireEvent.click(await screen.findByRole('button', { name: 'Unmark' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it.each([
    ['AUTO_TEXT_NONE', 'No model text has been written here: there is nothing to mark.'],
    [
      'AUTO_TEXT_CHANGED',
      'New model text was written after this tab was shown: read it, then mark again.',
    ],
  ])('a refusal %s has its own text', async (code, text) => {
    markReply = () => HttpResponse.json({ statusCode: 409, code, message: code }, { status: 409 });
    renderMark();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    expect((await screen.findByRole('alert')).textContent).toBe(text);
  });

  it('after AUTO_TEXT_CHANGED the tab shows the newer text and the next mark sends its time', async () => {
    const NEWER = '2026-11-12T10:10:00.000Z';
    markReply = () => {
      if (markBodies.length === 1) {
        state = { ...unread, autoTextAt: NEWER };
        return HttpResponse.json(
          { statusCode: 409, code: 'AUTO_TEXT_CHANGED', message: 'changed' },
          { status: 409 }
        );
      }
      state = { ...read, autoTextAt: NEWER };
      return HttpResponse.json(state);
    };
    renderMark();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(gets).toBe(2));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
    expect(await screen.findByRole('button', { name: 'Unmark' })).toBeTruthy();
    expect(markBodies).toEqual([{ autoTextAt: LANDED }, { autoTextAt: NEWER }]);
  });

  it('while the run is writing the button is closed and says why', async () => {
    renderMark('r1:written', 'building');
    const button = await screen.findByRole('button', { name: 'Mark as read' });
    expect(button).toBeDisabled();
    expect(
      screen.getByText(/The run is still writing: mark it read when the run ends\./)
    ).toBeTruthy();
  });

  it('a refusal is shown with its own text', async () => {
    markReply = () =>
      HttpResponse.json(
        { statusCode: 409, code: 'AUTO_TEXT_RUN_BUILDING', message: 'building' },
        { status: 409 }
      );
    renderMark();
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'The run is still writing: mark the text read when it ends.'
    );
  });

  it('a run that wrote again reloads the mark and the gate and drops the old refusal', async () => {
    markReply = () =>
      HttpResponse.json(
        { statusCode: 409, code: 'AUTO_TEXT_RUN_BUILDING', message: 'building' },
        { status: 409 }
      );
    const { rerender, invalidate } = renderMark('r1:proposed');
    fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
    await screen.findByRole('alert');
    const before = gets;
    invalidate.mockClear();

    state = read;
    rerender('r1:accepted');

    expect(await screen.findByRole('button', { name: 'Unmark' })).toBeTruthy();
    expect(gets).toBeGreaterThan(before);
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: versionKeys.publicationGate('v1') });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it.each([
    ['another run', 'r2:written', 'ready'],
    ['the run ended', 'r1:written', 'failed'],
  ])('%s reloads the mark and the gate', async (_label, stamp, status) => {
    const { rerender, invalidate } = renderMark('r1:written');
    await screen.findByRole('button', { name: 'Mark as read' });
    rerender(stamp, status);
    await waitFor(() => expect(gets).toBe(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: versionKeys.publicationGate('v1') });
  });

  it('a poll of the run that changed nothing written does not reload anything', async () => {
    const { rerender, invalidate } = renderMark('r1:written');
    await screen.findByRole('button', { name: 'Mark as read' });
    rerender('r1:written');
    expect(invalidate).not.toHaveBeenCalled();
    expect(gets).toBe(1);
  });

  it('the first show reads the mark once, also when the run arrives after the tab', async () => {
    const { rerender, invalidate } = renderMark(undefined);
    await screen.findByRole('button', { name: 'Mark as read' });
    rerender('r1:written');
    await screen.findByRole('button', { name: 'Mark as read' });
    expect(gets).toBe(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
