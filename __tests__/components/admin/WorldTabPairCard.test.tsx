import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { unplacedIssues } from '@/components/admin/books/WorldTab/WorldEntityFields';
import {
  cardOf,
  detail,
  ENTITY_SEEN,
  installWorldApi,
  LIST,
  renderWorldTab,
  row,
  rowOf,
  type WorldApi,
} from '../../helpers/worldApi';

/**
 * F08-8c: карточка пары героев во вкладке World - поля пары, общие главы только для чтения,
 * запись только полей пары (полей героя у пары нет, бэкенд отбил бы 400).
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

const PAIR_KEY = 'anna--tom';
const COMPARE = [
  { feature: 'Work', a: 'Maps.', chapterA: 1, b: 'Lights.', chapterB: 2 },
  { feature: 'Fate', a: 'Leads.', chapterA: 2, b: 'Stays.', chapterB: 2 },
];
const QUOTES = [
  { text: 'Lamp.', chapter: 2, speakerKey: 'anna', aboutKey: 'tom', interpretation: 'Her view.' },
];

const pairEntity = () => {
  const base = detail(PAIR_KEY).entity;
  return {
    ...base,
    key: PAIR_KEY,
    type: 'pair' as const,
    name: 'Anna and Tom',
    role: null,
    aliases: null,
    short: 'Two travellers.',
    compare: COMPARE,
    bonds: 'The crossing.',
    differences: 'Map and lamp.',
    conclusion: 'One leads.',
    quotes: QUOTES,
    mentions: { chapters: [1, 2], first: 1, perChapter: [], coPresence: [] },
  };
};

describe('WorldTab pair card (F08-8c)', () => {
  let rec: WorldApi;

  beforeAll(async () => {
    await import('@/lib/admin/book-world-validation');
  });

  beforeEach(() => {
    rec = installWorldApi();
    rec.list = () => [
      ...LIST(),
      row({ key: PAIR_KEY, type: 'pair', name: 'Anna and Tom', role: null }),
    ];
    rec.entityReply = (key) =>
      HttpResponse.json({
        ...detail(key),
        entity: key === PAIR_KEY ? pairEntity() : detail(key).entity,
      });
  });

  const openPair = async () => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: `Edit ${PAIR_KEY}` }));
    return cardOf(`Entity ${PAIR_KEY}`);
  };

  it('показывает поля пары и общие главы только для чтения; полей героя нет', async () => {
    const card = await openPair();
    expect(await card.findByLabelText('Pair: comparison table')).toHaveValue(
      JSON.stringify(COMPARE, null, 2)
    );
    expect(card.getByLabelText('Pair: what binds them')).toHaveValue('The crossing.');
    expect(card.getByLabelText('Pair: what sets them apart')).toHaveValue('Map and lamp.');
    expect(card.getByLabelText('Pair: conclusion')).toHaveValue('One leads.');
    expect(card.getByLabelText('Quotes')).toHaveValue(JSON.stringify(QUOTES, null, 2));
    expect(card.getByText('Shared chapters')).toBeInTheDocument();
    expect(card.queryByText(/must not contain "--"/)).toBeNull();
    expect(card.getByText(/2 chapters with both characters \(read-only\)/)).toBeInTheDocument();
    for (const label of [
      'Role',
      'Name forms (one per line)',
      'Appearance',
      'Character',
      'Key scenes',
    ]) {
      expect(card.queryByLabelText(label)).toBeNull();
    }
  });

  it('запись пары: только поля пары и общие, ключ типа pair, сверка по updatedAt карточки', async () => {
    const card = await openPair();
    fireEvent.change(await card.findByLabelText('Pair: conclusion'), {
      target: { value: 'New conclusion' },
    });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    const { key, query, body } = rec.entityPuts[0];
    expect(key).toBe(PAIR_KEY);
    expect(query).toBe(`?expectedUpdatedAt=${encodeURIComponent(ENTITY_SEEN)}`);
    expect(body).toEqual({
      language: 'en',
      type: 'pair',
      name: 'Anna and Tom',
      short: 'Two travellers.',
      compare: COMPARE,
      bonds: 'The crossing.',
      differences: 'Map and lamp.',
      quotes: QUOTES,
      conclusion: 'New conclusion',
      faq: null,
    });
  });

  it('ошибка на поле другого типа своего места не имеет - она в общем списке под формой', () => {
    const issues = [
      { path: 'aliasChapterExclusions.0', message: 'unknown alias' },
      { path: 'compare.0.a', message: 'empty' },
      { path: 'name', message: 'empty' },
    ];
    // У пары нет форм имени и исключений: ошибка на них - в общем списке; поле пары - на месте.
    expect(unplacedIssues(issues, 'pair')).toEqual([issues[0]]);
    // У героя нет таблицы сравнения: ошибка на ней - в общем списке; исключения - на месте.
    expect(unplacedIssues(issues, 'character')).toEqual([issues[1]]);
  });

  describe('окно импорта JSON версии: пара', () => {
    const pairJson = (quote: Record<string, unknown>) => ({
      language: 'en',
      entities: [
        {
          key: PAIR_KEY,
          type: 'pair',
          name: 'Anna and Tom',
          compare: COMPARE,
          quotes: [quote],
        },
      ],
    });

    const pasteImport = async (json: unknown) => {
      renderWorldTab(true);
      await rowOf('sonya');
      fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Import world JSON' }), {
        target: { value: JSON.stringify(json) },
      });
    };

    it('подсказка окна называет правило ключа героя (LEGACY-507)', async () => {
      renderWorldTab(true);
      await rowOf('sonya');
      fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
      expect(
        await screen.findByText(/A new character key must not contain "--"\./)
      ).toBeInTheDocument();
    });

    it('JSON пары принимается: пробное сохранение уходит, Import доступен', async () => {
      await pasteImport(pairJson(QUOTES[0]));
      await waitFor(() => expect(rec.puts.map((p) => p.query)).toEqual(['?dryRun=true']));
      const confirm = await screen.findByRole('button', { name: 'Import' });
      await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('цитата пары без aboutKey - ошибка по пути, на сервер ничего не уходит', async () => {
      const { aboutKey: _about, ...noAbout } = QUOTES[0];
      await pasteImport(pairJson(noAbout));
      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText(/entities\.0\.quotes\.0\.aboutKey/)).toBeInTheDocument();
      expect(rec.puts).toEqual([]);
      expect((screen.getByRole('button', { name: 'Import' }) as HTMLButtonElement).disabled).toBe(
        true
      );
    });
  });
});
