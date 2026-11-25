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

  describe('file upload (F08-11d-3)', () => {
    const picture = () => new File(['portrait-bytes'], 'portrait.png', { type: 'image/png' });
    const fileInput = async () =>
      (await screen.findByText(/^Upload a/)).querySelector(
        'input[type="file"]'
      ) as HTMLInputElement;
    const choose = async () => {
      fireEvent.change(await fileInput(), { target: { files: [picture()] } });
    };
    const refused = (code: string, status = 400) =>
      HttpResponse.json({ statusCode: status, code, message: 'x' }, { status });

    it('sends the chosen file as the one multipart field "file"; the new picture waits for Accept', async () => {
      let received: FormData | undefined;
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state({ accepted: file('old') }))),
        http.post(URL_IMAGE, async ({ request }) => {
          received = await request.formData();
          return HttpResponse.json(state({ accepted: file('old'), pending: file('new') }));
        })
      );
      renderPanel();
      await choose();
      expect(
        await screen.findByRole('img', { name: 'Sonya: Waiting for Accept' })
      ).toBeInTheDocument();
      expect(received, 'the upload request did not arrive').toBeDefined();
      expect([...received!.keys()]).toEqual(['file']);
      const sent = received!.get('file') as File;
      expect(await sent.text()).toBe('portrait-bytes');
      expect(sent.type).toBe('image/png');
      expect(screen.getByRole('img', { name: 'Sonya: Accepted' })).toBeInTheDocument();
    });

    it.each([
      ['WORLD_IMAGE_NOT_IMAGE', 'not a PNG, JPEG or WebP image'],
      ['WORLD_IMAGE_TOO_LARGE', 'up to 12 MB and 40 megapixels'],
      ['WORLD_IMAGE_TOO_SMALL', 'both sides must be at least 1200 px'],
    ])('a refused file %s shows its reason', async (code, text) => {
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state())),
        http.post(URL_IMAGE, () => refused(code))
      );
      renderPanel();
      await choose();
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
    });

    it('the label says what happens to the accepted and the waiting picture', async () => {
      server.use(http.get(URL_IMAGE, () => HttpResponse.json(state({ accepted: file('old') }))));
      const client = renderPanel();
      expect(
        await screen.findByText(/the accepted one stays on the site until Accept/)
      ).toBeInTheDocument();
      client.setQueryData(
        bookWorldQueryKeys.image('v1', 'sonya'),
        state({ accepted: file('old'), pending: file('new') })
      );
      expect(await screen.findByText(/replace the one waiting for Accept/)).toBeInTheDocument();
    });

    it('Accept clears a previous upload refusal', async () => {
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state({ pending: file('new') }))),
        http.post(URL_IMAGE, () => refused('WORLD_IMAGE_TOO_SMALL')),
        http.post(`${URL_IMAGE}/accept`, () => HttpResponse.json(state({ accepted: file('new') })))
      );
      renderPanel();
      await choose();
      expect(await screen.findByRole('alert')).toHaveTextContent('at least 1200 px');
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    });

    it('the file field is locked while Accept is in flight', async () => {
      let release: () => void = () => {};
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state({ pending: file('new') }))),
        http.post(
          `${URL_IMAGE}/accept`,
          () =>
            new Promise<Response>((resolve) => {
              release = () => resolve(HttpResponse.json(state({ accepted: file('new') })));
            })
        )
      );
      renderPanel();
      fireEvent.click(await screen.findByRole('button', { name: 'Accept' }));
      await waitFor(async () => expect(await fileInput()).toBeDisabled());
      release();
      await waitFor(async () => expect(await fileInput()).toBeEnabled());
    });

    it('409 WORLD_IMAGE_NOT_ALLOWED re-reads the state: the field and Accept go away', async () => {
      let gets = 0;
      server.use(
        http.get(URL_IMAGE, () => {
          gets += 1;
          return HttpResponse.json(
            gets === 1
              ? state({ pending: file('new') })
              : state({ allowed: false, roleAllowed: false, pending: file('new') })
          );
        }),
        http.post(URL_IMAGE, () => refused('WORLD_IMAGE_NOT_ALLOWED', 409))
      );
      renderPanel();
      await choose();
      expect(await screen.findByText(/Only main and secondary/)).toBeInTheDocument();
      // Отказ по роли сказан один раз — подсказкой, без второй красной строки.
      expect(screen.getAllByText(/Only main and secondary/)).toHaveLength(1);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(screen.queryByText(/^Upload a/)).toBeNull();
      expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
    });

    it('a file over 12 MB is refused before sending: no request', async () => {
      let posts = 0;
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state())),
        http.post(URL_IMAGE, () => {
          posts += 1;
          return HttpResponse.json(state());
        })
      );
      renderPanel();
      const big = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(big, 'size', { value: 12 * 1024 * 1024 + 1 });
      fireEvent.change(await fileInput(), { target: { files: [big] } });
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('The file is too large: up to 12 MB.');
      // Отказ до отправки — только по размеру: мегапиксели браузеру не известны.
      expect(alert).not.toHaveTextContent('megapixels');
      expect(posts).toBe(0);
    });

    it('413 with the code shows the size reason', async () => {
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state())),
        http.post(URL_IMAGE, () => refused('WORLD_IMAGE_TOO_LARGE', 413))
      );
      renderPanel();
      await choose();
      expect(await screen.findByRole('alert')).toHaveTextContent('up to 12 MB');
    });

    it('while the file goes up the field and Accept are locked; after a refusal the field is cleared', async () => {
      let release: () => void = () => {};
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state({ pending: file('old') }))),
        http.post(
          URL_IMAGE,
          () =>
            new Promise<Response>((resolve) => {
              release = () => resolve(refused('WORLD_IMAGE_TOO_SMALL'));
            })
        )
      );
      renderPanel();
      await choose();
      await waitFor(async () => expect(await fileInput()).toBeDisabled());
      expect(screen.getByRole('button', { name: 'Accept' })).toBeDisabled();
      release();
      expect(await screen.findByRole('alert')).toHaveTextContent('at least 1200 px');
      const input = await fileInput();
      expect(input).toBeEnabled();
      expect(input.value).toBe('');
    });

    it('no upload for a hero without the right to an illustration', async () => {
      server.use(
        http.get(URL_IMAGE, () => HttpResponse.json(state({ allowed: false, roleAllowed: false })))
      );
      renderPanel();
      expect(await screen.findByText('No illustration yet.')).toBeInTheDocument();
      expect(screen.queryByText(/^Upload a/)).toBeNull();
    });
  });
});
