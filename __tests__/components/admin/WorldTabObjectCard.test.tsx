import { fireEvent, screen, waitFor } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cardOf,
  detail,
  installWorldApi,
  LIST,
  renderWorldTab,
  row,
  type WorldApi,
} from '../../helpers/worldApi';

/**
 * F08-13b: карточка предмета, понятия и события во вкладке World - поля своего перечня
 * (`WORLD_BLOCKS_OF_TYPE` бэкенда), связи с героями и темами JSON-списком; без роли, полей героя
 * и раздела «Illustration brief»; запись только своих полей (поля героя бэкенд отбил бы 400).
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

const HERO_FIELDS = {
  role: null,
  appearance: null,
  character: null,
  profile: null,
  arc: null,
  relations: null,
  critique: null,
  prototypes: null,
  adaptations: null,
  sources: null,
  kind: null,
  wikidataId: null,
  location: null,
};

const objectEntity = (key: string, type: 'object' | 'term' | 'event') => {
  const base = detail(key).entity;
  return {
    ...base,
    ...HERO_FIELDS,
    key,
    type,
    name: `The ${key}`,
    aliases: [],
    short: 'Short text.',
    significance: 'Why it matters.',
    description: type === 'object' ? 'A porter axe.' : null,
    scenes: null,
    quotes: null,
    faq: null,
    characterKeys: type === 'term' ? null : ['raskolnikov'],
    themeKeys: type === 'object' ? ['crime'] : null,
    editor: { ...base.editor!, imageBrief: 'Should never be shown.', imageBriefStale: false },
  };
};

const ENTITIES = { axe: 'object', superman: 'term', murder: 'event' } as const;

describe('WorldTab object, term and event card (F08-13b)', () => {
  let rec: WorldApi;

  beforeAll(async () => {
    await import('@/lib/admin/book-world-validation');
  });

  beforeEach(() => {
    rec = installWorldApi();
    rec.list = () => [
      ...LIST(),
      ...Object.entries(ENTITIES).map(([key, type]) =>
        row({ key, type, name: `The ${key}`, role: null })
      ),
    ];
    rec.entityReply = (key) => {
      const type = ENTITIES[key as keyof typeof ENTITIES];
      return HttpResponse.json({
        ...detail(key),
        entity: type ? objectEntity(key, type) : detail(key).entity,
      });
    };
  });

  const open = async (key: string) => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${key}` }));
    return cardOf(`Entity ${key}`);
  };

  it('an object shows its fields and links; no role, hero fields or illustration brief', async () => {
    const card = await open('axe');
    expect(await card.findByLabelText('Significance in the book')).toHaveValue('Why it matters.');
    expect(card.getByLabelText('Description')).toHaveValue('A porter axe.');
    expect(card.getByLabelText('Linked characters (character keys)')).toHaveValue(
      JSON.stringify(['raskolnikov'], null, 2)
    );
    expect(card.getByLabelText('Linked themes (analysis theme keys)')).toHaveValue(
      JSON.stringify(['crime'], null, 2)
    );
    expect(card.getByLabelText('FAQ')).toBeInTheDocument();
    for (const label of ['Role', 'Appearance', 'Character', 'Relations', 'Sources', 'Key scenes']) {
      expect(card.queryByLabelText(label)).toBeNull();
    }
    expect(card.queryByRole('region', { name: 'Illustration brief' })).toBeNull();
  });

  it('a term shows no description, faq, scenes or links', async () => {
    const card = await open('superman');
    expect(await card.findByLabelText('Significance in the book')).toHaveValue('Why it matters.');
    expect(card.getByLabelText('Quotes')).toBeInTheDocument();
    for (const label of [
      'Description',
      'Place: description',
      'FAQ',
      'Key scenes',
      'Linked characters (character keys)',
      'Linked themes (analysis theme keys)',
      'Role',
    ]) {
      expect(card.queryByLabelText(label)).toBeNull();
    }
  });

  it('an event shows scenes and linked characters, no description, faq or themes', async () => {
    const card = await open('murder');
    expect(await card.findByLabelText('Key scenes')).toBeInTheDocument();
    expect(card.getByLabelText('Linked characters (character keys)')).toBeInTheDocument();
    for (const label of ['Description', 'FAQ', 'Linked themes (analysis theme keys)', 'Role']) {
      expect(card.queryByLabelText(label)).toBeNull();
    }
  });

  it('saving an object sends only its fields: no role, profile, arc or other hero fields', async () => {
    const card = await open('axe');
    fireEvent.change(await card.findByLabelText('Linked characters (character keys)'), {
      target: { value: '["raskolnikov", "sonya"]' },
    });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    const { key, body } = rec.entityPuts[0];
    expect(key).toBe('axe');
    expect(body).toMatchObject({
      language: 'en',
      type: 'object',
      name: 'The axe',
      short: 'Short text.',
      significance: 'Why it matters.',
      description: 'A porter axe.',
      characterKeys: ['raskolnikov', 'sonya'],
      themeKeys: ['crime'],
    });
    for (const field of [
      'role',
      'profile',
      'arc',
      'appearance',
      'character',
      'scenes',
      'sources',
      'imageBrief',
      'kind',
    ]) {
      expect(body).not.toHaveProperty(field);
    }
  });

  // /qa круг 1 (front-tests): запись карточкой — у каждого типа, не только у предмета.
  it.each([
    [
      'superman',
      'term',
      { short: 'A new short.', significance: 'Why it matters.' },
      ['description', 'faq', 'characterKeys', 'themeKeys', 'scenes'],
    ],
    [
      'murder',
      'event',
      {
        short: 'A new short.',
        significance: 'Why it matters.',
        characterKeys: ['raskolnikov'],
      },
      ['description', 'faq', 'themeKeys'],
    ],
  ] as const)(
    'saving a %s (%s) sends its type and only its fields',
    async (key, type, fields, foreign) => {
      const card = await open(key);
      fireEvent.change(await card.findByLabelText('Short'), {
        target: { value: 'A new short.' },
      });
      fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
      await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
      const { key: putKey, body } = rec.entityPuts[0];
      expect(putKey).toBe(key);
      expect(body).toMatchObject({ language: 'en', type, name: `The ${key}`, ...fields });
      for (const field of [...foreign, 'role', 'profile', 'arc', 'imageBrief', 'kind', 'sources']) {
        expect(body).not.toHaveProperty(field);
      }
    }
  );
});
