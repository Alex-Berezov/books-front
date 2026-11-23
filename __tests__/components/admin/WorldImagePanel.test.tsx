import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookWorldQueryKeys } from '@/api/hooks';
import { WorldImagePanel } from '@/components/admin/books/WorldTab/WorldImagePanel';
import type { WorldImageGeneration, WorldImageState } from '@/types/api-schema';
import { server } from '../../msw/server';

/**
 * F08-11b: иллюстрация героя во вкладке World - превью, Generate/Regenerate, Accept, опрос
 * идущей генерации, причины отказа, отказы ручек.
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
const generation = (patch: Partial<WorldImageGeneration> = {}): WorldImageGeneration => ({
  operationId: 'op1',
  status: 'active',
  failedReason: null,
  spentUsd: '0',
  ...patch,
});
const state = (patch: Partial<WorldImageState> = {}): WorldImageState => ({
  key: 'sonya',
  allowed: true,
  accepted: null,
  acceptedAt: null,
  pending: null,
  generation: null,
  estimateUsd: '0.25000000',
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

describe('WorldImagePanel (F08-11b)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('no picture: Generate, estimate, nothing to accept', async () => {
    server.use(http.get(URL_IMAGE, () => HttpResponse.json(state())));
    renderPanel();
    expect(await screen.findByRole('button', { name: 'Generate' })).toBeEnabled();
    expect(screen.getByText(/Up to \$0\.25 per image/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
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
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeInTheDocument();
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
    expect(await screen.findByRole('alert')).toHaveTextContent(/regenerated meanwhile/);
    await waitFor(() => expect(gets).toBe(2));
    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Sonya: Waiting for Accept' })).toHaveAttribute(
        'src',
        expect.stringContaining('newer')
      )
    );
  });

  it('Regenerate posts once and shows the running state with the button locked', async () => {
    let posts = 0;
    server.use(
      http.get(URL_IMAGE, () => HttpResponse.json(state({ accepted: file('old') }))),
      http.post(URL_IMAGE, () => {
        posts += 1;
        return HttpResponse.json(state({ accepted: file('old'), generation: generation() }), {
          status: 202,
        });
      })
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Regenerate' }));
    expect(await screen.findByText('Generating the illustration…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled();
    expect(posts).toBe(1);
  });

  it('re-reads every 3 s while active, shows the pending picture and stops after', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        return HttpResponse.json(
          gets < 2
            ? state({ generation: generation() })
            : state({ pending: file('new'), generation: generation({ status: 'done' }) })
        );
      })
    );
    renderPanel();
    expect(await screen.findByText('Generating the illustration…')).toBeInTheDocument();
    expect(gets).toBe(1);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeEnabled();
    expect(screen.queryByText('Generating the illustration…')).toBeNull();
    expect(gets).toBe(2);
    await vi.advanceTimersByTimeAsync(9000);
    expect(gets).toBe(2);
  });

  it('a refusal of Generate goes away when the running generation ends', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        if (gets === 1) return HttpResponse.json(state());
        if (gets === 2) return HttpResponse.json(state({ generation: generation() }));
        return HttpResponse.json(
          state({ pending: file('new'), generation: generation({ status: 'done' }) })
        );
      }),
      http.post(URL_IMAGE, () => conflict('WORLD_IMAGE_IN_PROGRESS'))
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/already running/);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('failed generation names the reason', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({
            generation: generation({ status: 'failed', failedReason: 'WORLD_IMAGE_NOT_IMAGE' }),
          })
        )
      )
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(/not a PNG, JPEG or WEBP/);
  });

  it('failure without a code: a general phrase', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(state({ generation: generation({ status: 'failed' }) }))
      )
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent('The generation failed.');
  });

  it('unknown failure code is shown as is', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({ generation: generation({ status: 'failed', failedReason: 'SOMETHING_NEW' }) })
        )
      )
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The generation failed: SOMETHING_NEW.'
    );
  });

  it('paused with a reason: the status and the reason', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({
            generation: generation({ status: 'paused', failedReason: 'LLM_INSUFFICIENT_FUNDS' }),
          })
        )
      )
    );
    renderPanel();
    expect(
      await screen.findByText(/^The (generation is paused|last generation was cancelled)/)
    ).toHaveTextContent(
      /The generation is paused\. The OpenRouter balance .* Generate to replace it./
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('paused first generation: the advice names the Generate button, a common LLM code as a phrase', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({
            generation: generation({ status: 'paused', failedReason: 'LLM_CEILING_REACHED' }),
          })
        )
      )
    );
    renderPanel();
    expect(await screen.findByText(/^The generation is paused/)).toHaveTextContent(
      'The generation is paused. The spending ceiling is reached: raise it in LLM settings. Generate to replace it.'
    );
    expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled();
  });

  it.each([
    [
      'LLM_BUDGET_EXCEEDED:operation',
      'The generation cost more than its limit: generate again or choose a cheaper image model in LLM settings.',
    ],
    ['LLM_BUDGET_EXCEEDED:ceiling', 'The spending ceiling is reached: raise it in LLM settings.'],
  ])('failed on the budget during the step (%s): advice for that limit', async (code, text) => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({ generation: generation({ status: 'failed', failedReason: code }) })
        )
      )
    );
    renderPanel();
    expect(await screen.findByRole('alert')).toHaveTextContent(text);
  });

  it('paused with a picture: the advice names the Regenerate button', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({ accepted: file('old'), generation: generation({ status: 'paused' }) })
        )
      )
    );
    renderPanel();
    expect(await screen.findByText(/^The generation is paused/)).toHaveTextContent(
      'The generation is paused. Regenerate to replace it.'
    );
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeEnabled();
  });

  it('paused with an unknown code: the code as a reason, not «failed»', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({ generation: generation({ status: 'paused', failedReason: 'SOMETHING_NEW' }) })
        )
      )
    );
    renderPanel();
    const line = await screen.findByText(/^The generation is paused/);
    expect(line).toHaveTextContent('Reason: SOMETHING_NEW.');
    expect(line).not.toHaveTextContent('failed');
  });

  it('cancelled: the status line, its reason, no alert', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(
          state({
            generation: generation({ status: 'cancelled', failedReason: 'LLM_UNAVAILABLE' }),
          })
        )
      )
    );
    renderPanel();
    expect(
      await screen.findByText(/^The (generation is paused|last generation was cancelled)/)
    ).toHaveTextContent('The last generation was cancelled. The image model is unavailable now.');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a failed re-read while running stops the polling and offers Retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        return gets < 2
          ? HttpResponse.json(state({ generation: generation() }))
          : HttpResponse.json({ statusCode: 502, message: 'down' }, { status: 502 });
      })
    );
    renderPanel();
    expect(await screen.findByText('Generating the illustration…')).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(3000);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Could not refresh the illustration/
    );
    expect(gets).toBe(2);
    await vi.advanceTimersByTimeAsync(9000);
    expect(gets).toBe(2);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('409 on Generate shows the server code as text and re-reads the state', async () => {
    let gets = 0;
    server.use(
      http.get(URL_IMAGE, () => {
        gets += 1;
        return HttpResponse.json(state());
      }),
      http.post(URL_IMAGE, () => conflict('WORLD_IMAGE_NO_APPEARANCE'))
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/no appearance text/);
    await waitFor(() => expect(gets).toBe(2));
  });

  it('5xx on Generate is left to the global toast: no line in the panel', async () => {
    let posts = 0;
    server.use(
      http.get(URL_IMAGE, () => HttpResponse.json(state())),
      http.post(URL_IMAGE, () => {
        posts += 1;
        return HttpResponse.json({ statusCode: 502, message: 'down' }, { status: 502 });
      })
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(posts).toBe(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toBeEnabled());
    expect(screen.queryByRole('alert')).toBeNull();
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
    expect(await screen.findByRole('button', { name: 'Generate' })).toBeInTheDocument();
  });

  it('not allowed: the explanation, no buttons', async () => {
    server.use(http.get(URL_IMAGE, () => HttpResponse.json(state({ allowed: false }))));
    renderPanel();
    expect(
      await screen.findByText(/A new illustration needs a main or secondary/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('not allowed with pictures: they stay visible, Accept stays (the server checks the role)', async () => {
    server.use(
      http.get(URL_IMAGE, () =>
        HttpResponse.json(state({ allowed: false, accepted: file('old'), pending: file('new') }))
      )
    );
    renderPanel();
    expect(await screen.findByRole('img', { name: 'Sonya: Accepted' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Sonya: Waiting for Accept' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Generate/ })).toBeNull();
  });
});
