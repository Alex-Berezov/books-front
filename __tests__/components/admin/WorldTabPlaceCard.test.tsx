import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORLD_GEO_REASON_TEXT } from '@/components/admin/books/WorldTab/WorldPlaceFields';
import {
  cardOf,
  detail,
  installWorldApi,
  LIST,
  renderWorldTab,
  row,
  type WorldApi,
} from '../../helpers/worldApi';
import { server } from '../../msw/server';

/**
 * F08-12b: карточка места во вкладке World - свои поля (вид, номер Wikidata, где, значение,
 * описание, сцены, цитаты, FAQ, формы имени), без роли и полей героя; причина отсутствия точки;
 * запись только полей места; у места только ТЗ на иллюстрацию, панели загрузки нет ни у кого
 * (решение `F08 | F08-12b` R1).
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

const PLACE_KEY = 'garret';
const SCENES = [{ chapter: 1, title: 'The plan', text: 'He lies and thinks.', paragraph: null }];

const placeEntity = () => {
  const base = detail(PLACE_KEY).entity;
  return {
    ...base,
    key: PLACE_KEY,
    type: 'place' as const,
    name: 'The garret',
    role: null,
    aliases: ['the room'],
    short: 'A tiny room.',
    appearance: null,
    character: null,
    profile: null,
    arc: null,
    relations: null,
    critique: null,
    prototypes: null,
    adaptations: null,
    sources: null,
    kind: 'real' as const,
    wikidataId: 'Q656',
    location: 'St Petersburg',
    significance: 'The hero plans the murder here.',
    description: 'A low closet under the roof.',
    scenes: SCENES,
    quotes: null,
    faq: null,
    editor: {
      ...base.editor!,
      geo: { wikidataId: 'Q656', checkedAt: '2026-11-25T00:00:00Z', reason: 'name_mismatch' },
    },
  };
};

describe('WorldTab place card (F08-12b)', () => {
  let rec: WorldApi;

  beforeAll(async () => {
    await import('@/lib/admin/book-world-validation');
  });

  beforeEach(() => {
    rec = installWorldApi();
    rec.list = () => [
      ...LIST(),
      row({ key: PLACE_KEY, type: 'place', name: 'The garret', role: null }),
    ];
    rec.entityReply = (key) =>
      HttpResponse.json({
        ...detail(key),
        entity: key === PLACE_KEY ? placeEntity() : detail(key).entity,
      });
  });

  const openPlace = async (isAdmin = true) => {
    renderWorldTab(isAdmin);
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${PLACE_KEY}` }));
    return cardOf(`Entity ${PLACE_KEY}`);
  };

  it('shows the place fields and the point reason; no role and no hero fields', async () => {
    const card = await openPlace();
    expect(await card.findByLabelText('Place kind')).toHaveValue('real');
    expect(card.getByLabelText('Wikidata ID')).toHaveValue('Q656');
    expect(card.getByLabelText('Place: location')).toHaveValue('St Petersburg');
    expect(card.getByLabelText('Place: significance in the book')).toHaveValue(
      'The hero plans the murder here.'
    );
    expect(card.getByLabelText('Place: description')).toHaveValue('A low closet under the roof.');
    expect(card.getByLabelText('Key scenes')).toHaveValue(JSON.stringify(SCENES, null, 2));
    expect(card.getByLabelText('Quotes')).toBeInTheDocument();
    expect(card.getByLabelText('FAQ')).toBeInTheDocument();
    expect(card.getByLabelText('Name forms (one per line)')).toHaveValue('the room');
    expect(card.getByText(WORLD_GEO_REASON_TEXT.name_mismatch)).toBeInTheDocument();
    for (const label of ['Role', 'Appearance', 'Character', 'Relations', 'Sources']) {
      expect(card.queryByLabelText(label)).toBeNull();
    }
    expect(card.queryByText(/must not contain "--"/)).toBeNull();
  });

  it('save sends only place fields; a fictional place clears wikidataId', async () => {
    const card = await openPlace();
    fireEvent.change(await card.findByLabelText('Place kind'), {
      target: { value: 'fictional' },
    });
    expect(card.queryByLabelText('Wikidata ID')).toBeNull();
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    const { key, body } = rec.entityPuts[0];
    expect(key).toBe(PLACE_KEY);
    expect(body).toMatchObject({
      language: 'en',
      type: 'place',
      name: 'The garret',
      aliases: ['the room'],
      kind: 'fictional',
      wikidataId: null,
      location: 'St Petersburg',
      description: 'A low closet under the roof.',
      scenes: SCENES,
    });
    for (const field of ['role', 'appearance', 'profile', 'arc', 'sources', 'compare']) {
      expect(body).not.toHaveProperty(field);
    }
  });

  // F08-12c-2 (решение `F08 | F08-12c-2`): у места картинка есть - ТЗ по «Описанию» видно всем,
  // панель загрузки с пределом от 1200×675 - только администратору; не администратору ручка не зовётся.
  it.each([
    ['admin', true],
    ['not admin', false],
  ])(
    '%s: a place shows the brief; the illustration panel only for an admin',
    async (_who, isAdmin) => {
      const imageRequests: string[] = [];
      server.use(
        http.get('http://localhost:5000/api/admin/versions/v1/world/:key/image', ({ params }) => {
          imageRequests.push(String(params.key));
          return HttpResponse.json({
            key: String(params.key),
            allowed: true,
            roleAllowed: true,
            keyConflict: false,
            accepted: null,
            acceptedAt: null,
            pending: null,
          });
        })
      );
      rec.entityReply = (key) =>
        HttpResponse.json({
          ...detail(key),
          entity:
            key === PLACE_KEY
              ? {
                  ...placeEntity(),
                  editor: {
                    ...placeEntity().editor,
                    imageBrief: 'Wide view of a low garret.',
                    imageBriefStale: false,
                  },
                }
              : detail(key).entity,
        });
      const card = await openPlace(isAdmin);
      const brief = await card.findByRole('region', { name: 'Illustration brief' });
      expect(brief).toHaveTextContent('Wide view of a low garret.');
      if (isAdmin) {
        expect(await card.findByText(/from 1200×675 px/)).toBeInTheDocument();
        expect(imageRequests).toEqual([PLACE_KEY]);
      } else {
        expect(card.queryByRole('region', { name: 'Illustration' })).toBeNull();
        expect(card.queryByText(/^Upload a/)).toBeNull();
        expect(imageRequests).toEqual([]);
      }
    }
  );
});
