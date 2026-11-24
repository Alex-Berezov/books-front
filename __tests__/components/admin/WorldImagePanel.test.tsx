import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookWorldQueryKeys } from '@/api/hooks';
import { WorldImagePanel } from '@/components/admin/books/WorldTab/WorldImagePanel';
import type { WorldImageState } from '@/types/api-schema';
import { server } from '../../msw/server';

/**
 * F08-11b: иллюстрация героя во вкладке World - превью принятой и ожидающей, Accept, отказы ручек.
 * F08-11d: сайт картинки не генерирует - ни Generate/Regenerate, ни цены, ни опроса.
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const URL_IMAGE = 'http://localhost:5000/api/admin/versions/v1/world/sonya/image';
const file = (mediaId: string) => ({
  url: `https://cdn.example/illustrations/${mediaId}.png`,
  width: 1200,
  height: 1200,
  mediaId,
});
const state = (patch: Partial<WorldImageState> = {}): WorldImageState => ({
  key: 'sonya',
  allowed: true,
  roleAllowed: true,
  accepted: null,
  acceptedAt: null,
  pending: null,
  ...patch,
});
const conflict = (code: string) =>
  HttpResponse.json({ statusCode: 409, code, message: 'x' }, { status: 409 });

const renderPanel = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorldImagePanel versionId="v1" entityKey="sonya" name="Sonya" />
    </QueryClientProvider>
  );
  return client;
};

const NO_GENERATION = /^(Generate|Regenerate)$/;
const PRICE = /per image|\$/;

describe('WorldImagePanel (F08-11b, F08-11d)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no picture: a short line, no Generate, no price, nothing to accept', async () => {
    server.use(http.get(URL_IMAGE, () => HttpResponse.json(state())));
    renderPanel();
    expect(await screen.findByText('No illustration yet.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: NO_GENERATION })).toBeNull();
    expect(screen.queryByText(PRICE)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('pending picture: Accept, no Regenerate and no price', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(state({ accepted: file('old'), pending: file('new') }))
      )
    );
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeEnabled();
    expect(screen.getByRole('img', { name: 'Sonya: Accepted' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sonya: Waiting for Accept' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: NO_GENERATION })).toBeNull();
    expect(screen.queryByText(PRICE)).toBeNull();
  });

  it('pending picture: Accept sends its mediaId and the accepted one replaces it', async () => {
    let body: unknown = null;
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(state({ accepted: file('old'), pending: file('new') }))
      ),
      http.post(`${URL_IMAGE}/accept`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(state({ accepted: file('new') }));
      })
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(body).toEqual({ pendingMediaId: 'new' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull());
    expect(screen.getByRole('img', { name: 'Sonya: Accepted' })).toHaveAttribute(
      'src',
      expect.stringContaining('new')
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('Accept re-reads only the entity card (its `image`), not the illustration again', async () => {
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        return HttpResponse.json(state({ pending: file('new') }));
      }),
      http.post(`${URL_IMAGE}/accept`, () => HttpResponse.json(state({ accepted: file('new') })))
    );
    const client = renderPanel();
    const spy = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith({
        queryKey: bookWorldQueryKeys.entity('v1', 'sonya'),
        exact: true,
      })
    );
    expect(spy).toHaveBeenCalledTimes(1);
    expect(gets).toBe(1);
  });

  it('409 WORLD_IMAGE_CHANGED on Accept: says so and re-reads the state', async () => {
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        return HttpResponse.json(state({ pending: file(gets < 2 ? 'old' : 'newer') }));
      }),
      http.post(`${URL_IMAGE}/accept`, () => conflict('WORLD_IMAGE_CHANGED'))
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/replaced meanwhile/);
    await waitFor(() => expect(gets).toBe(2));
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Sonya: Waiting for Accept' })).toHaveAttribute(
        'src',
        expect.stringContaining('newer')
      )
    );
  });

  it('5xx on Accept is left to the global toast: no line in the panel', async () => {
    let posts = 0;
    server.use(
      http.get(URL_IMAGE, () => HttpResponse.json(state({ pending: file('new') }))),
      http.post(`${URL_IMAGE}/accept`, () => {
        posts += 1;
        return HttpResponse.json({ statusCode: 502, message: 'down' }, { status: 502 });
      })
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(posts).toBe(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('the state is not polled: nothing is generating on the site', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        // Старый бэкенд (до тега F08-11d-1) ещё шлёт `generation`: прежняя панель по нему опрашивала.
        return HttpResponse.json({
          ...state({ pending: file('new') }),
          generation: { operationId: 'op-1', status: 'active', pauseReason: null },
        });
      })
    );
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(15000);
    expect(gets).toBe(1);
  });

  it('load error: Retry reads again', async () => {
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        return gets < 2
          ? HttpResponse.json({ statusCode: 404, message: 'none' }, { status: 404 })
          : HttpResponse.json(state());
      })
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load the illustration/);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('No illustration yet.')).toBeInTheDocument();
  });

  it('a failed re-read keeps the pictures and offers Retry', async () => {
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        return gets < 2
          ? HttpResponse.json(state({ pending: file('new') }))
          : HttpResponse.json({ statusCode: 404, message: 'none' }, { status: 404 });
      })
    );
    const client = renderPanel();
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument();
    void client.invalidateQueries({ queryKey: bookWorldQueryKeys.image('v1', 'sonya') });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Could not refresh the illustration/
    );
    expect(screen.getByRole('img', { name: 'Sonya: Waiting for Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('not allowed: the role hint, no buttons', async () => {
    server.use(
      http.get(URL_IMAGE, () => HttpResponse.json(state({ allowed: false, roleAllowed: false })))
    );
    renderPanel();
    expect(await screen.findByText('No illustration yet.')).toBeInTheDocument();
    expect(
      screen.getByText('Only main and secondary characters get an illustration.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('old backend: allowed=false (no appearance) but roleAllowed - Accept stays, no role hint', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(state({ allowed: false, roleAllowed: true, pending: file('new') }))
      )
    );
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeEnabled();
    expect(screen.queryByText(/Only main and secondary/)).toBeNull();
  });

  it('allowed: no role hint', async () => {
    server.use(http.get(URL_IMAGE, () => HttpResponse.json(state())));
    renderPanel();
    expect(await screen.findByText('No illustration yet.')).toBeInTheDocument();
    expect(screen.queryByText(/Only main and secondary/)).toBeNull();
  });

  it('not allowed with pictures: they stay visible, no Accept, the role hint', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({
            allowed: false,
            roleAllowed: false,
            accepted: file('old'),
            pending: file('new'),
          })
        )
      )
    );
    renderPanel();
    expect(await screen.findByRole('img', { name: 'Sonya: Accepted' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sonya: Waiting for Accept' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    expect(screen.getByText(/Only main and secondary/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: NO_GENERATION })).toBeNull();
  });
});
