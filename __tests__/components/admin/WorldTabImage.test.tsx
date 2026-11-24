import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookWorldEntitySaveResponse, WorldImageState } from '@/types/api-schema';
import {
  API,
  cardOf,
  detail,
  installWorldApi,
  LIST,
  renderWorldTab,
  row,
  rowOf,
  type WorldApi,
} from '../../helpers/worldApi';
import { server } from '../../msw/server';

/**
 * F08-11b: панель иллюстрации в карточке героя — только у `admin` (ручки `@Roles(Admin)`, решение
 * `F08 | F08-11` Р5); запись сущности перечитывает её (`allowed` зависит от роли героя).
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

const IMAGE = `${API}/admin/versions/v1/world/:key/image`;
const PAIR_KEY = 'anna--tom';
const imageState = (allowed: boolean): WorldImageState => ({
  key: 'sonya',
  allowed,
  roleAllowed: allowed,
  accepted: null,
  acceptedAt: null,
  pending: null,
});

describe('WorldTab illustration panel (F08-11b)', () => {
  let rec: WorldApi;
  let imageGets: number;

  beforeAll(async () => {
    await import('@/lib/admin/book-world-validation');
  });

  beforeEach(() => {
    rec = installWorldApi();
    imageGets = 0;
    server.use(
      http.get(IMAGE, () => {
        imageGets += 1;
        return HttpResponse.json(imageState(imageGets > 1));
      })
    );
  });

  const openSonya = async (isAdmin: boolean) => {
    renderWorldTab(isAdmin);
    await rowOf('sonya');
    fireEvent.click(screen.getByRole('button', { name: 'Edit sonya' }));
    return cardOf('Entity sonya');
  };

  it('content manager: no panel and no request to the admin-only route', async () => {
    const card = await openSonya(false);
    await card.findByLabelText('Short');
    expect(card.queryByRole('region', { name: 'Illustration' })).toBeNull();
    expect(imageGets).toBe(0);
  });

  it('admin, a pair (not a character): no panel and no request', async () => {
    rec.list = () => [
      ...LIST(),
      row({ key: PAIR_KEY, type: 'pair', name: 'Anna and Tom', role: null }),
    ];
    rec.entityReply = (key) =>
      HttpResponse.json({
        ...detail(key),
        entity: {
          ...detail(key).entity,
          key,
          type: key === PAIR_KEY ? ('pair' as const) : detail(key).entity.type,
          role: null,
        },
      });
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${PAIR_KEY}` }));
    const card = await cardOf(`Entity ${PAIR_KEY}`);
    await card.findByLabelText('Short');
    expect(card.queryByRole('region', { name: 'Illustration' })).toBeNull();
    expect(imageGets).toBe(0);
  });

  it('admin: the panel; saving the entity re-reads whether an illustration is allowed', async () => {
    rec.entityPutReply = () =>
      HttpResponse.json({
        entity: detail('sonya').entity,
        hasCore: false,
        warnings: [],
        recountQueued: false,
      } satisfies BookWorldEntitySaveResponse);
    const card = await openSonya(true);
    expect(await card.findByText('No illustration yet.')).toBeInTheDocument();
    expect(card.getByText(/Only main and secondary/)).toBeInTheDocument();
    fireEvent.change(await card.findByLabelText('Short'), { target: { value: 'New short' } });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(card.queryByText(/Only main and secondary/)).toBeNull());
    await waitFor(() => expect(imageGets).toBe(2));
  });
});
