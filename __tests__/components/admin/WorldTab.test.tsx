import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../fixtures/example-world.en.json';
import {
  detail,
  ENTITY_SEEN,
  installWorldApi,
  LANDED,
  json409,
  LIST_NEWEST,
  renderWorldTab,
  rowOf,
  type WorldApi,
} from '../../helpers/worldApi';

/**
 * F08-1: вкладка «World» (`product.md` §17 п.2-3, 7). Настоящие вкладка, хуки и клиент; ответы
 * бэкенда — msw. Отметка «прочитано» и флаги зовут свои ручки с тем, что видела вкладка;
 * кнопка «прочитано» только у `admin`; ключ сохранённой сущности не правится.
 */

// A live session lets httpXxxAuth pass its 401-before-network check (`LEGACY-465`).
vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

describe('WorldTab (F08-1)', () => {
  let rec: WorldApi;

  beforeAll(async () => {
    // Модуль проверок грузится лениво (zod): прогрев до тестов.
    await import('@/lib/admin/book-world-validation');
  });

  beforeEach(() => {
    rec = installWorldApi();
  });

  it('lists type, key, name, role, core or what is missing, presence and the read state', async () => {
    renderWorldTab(true);
    const main = await rowOf('raskolnikov');
    expect(main.getByText('character')).toBeTruthy();
    expect(main.getByText('Rodion Raskolnikov')).toBeTruthy();
    expect(main.getByText('main')).toBeTruthy();
    expect(main.getByText('yes')).toBeTruthy();
    expect(main.getByText('Not read')).toBeTruthy();
    // F08-2: в списке — число глав присутствия; не посчитано — прочерк.
    expect(main.getByTitle('Chapters the entity is found in').textContent).toBe('2');
    expect(
      (await rowOf('lebezyatnikov')).getByTitle('Chapters the entity is found in').textContent
    ).toBe('—');
    // Посчитано и нигде не найдено — ноль, а не прочерк «не посчитано».
    expect((await rowOf('sonya')).getByTitle('Chapters the entity is found in').textContent).toBe(
      '0'
    );

    const sonya = await rowOf('sonya');
    expect(sonya.getByText('missing: quotes, mentions')).toBeTruthy();
    expect(sonya.getByText('Read')).toBeTruthy();
    expect(sonya.queryByRole('button', { name: /as read/ })).toBeNull();

    const minor = await rowOf('lebezyatnikov');
    expect(minor.getByText('No model text')).toBeTruthy();
    expect(minor.queryByRole('button', { name: /as read/ })).toBeNull();
    // Публичных страниц до F08-3 нет — и ссылки на них нет.
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('«Mark as read» posts the autoTextAt the tab showed to the read endpoint of that entity', async () => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark raskolnikov as read' }));
    await waitFor(() =>
      expect(rec.reads).toEqual([{ key: 'raskolnikov', body: { autoTextAt: LANDED } }])
    );
    expect(rec.flags).toEqual([]);
  });

  it.each([
    ['WORLD_TEXT_CHANGED', /model text changed after the list was loaded/],
    ['AUTO_TEXT_NONE', /no model text to mark as read/],
  ])('a refused read mark (409 %s) is shown, not swallowed', async (code, text) => {
    rec.readReply = () => json409(code);
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Mark raskolnikov as read' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(text);
  });

  it('«Visible» and «Indexed» call the rec.flags endpoint with only their own flag', async () => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('switch', { name: 'Visible: sonya' }));
    await waitFor(() => expect(rec.flags).toEqual([{ key: 'sonya', body: { isVisible: false } }]));
    fireEvent.click(screen.getByRole('switch', { name: 'Indexed: raskolnikov' }));
    await waitFor(() =>
      expect(rec.flags).toEqual([
        { key: 'sonya', body: { isVisible: false } },
        { key: 'raskolnikov', body: { isIndexable: false } },
      ])
    );
    expect(rec.reads).toEqual([]);
  });

  it('the read button is hidden from a content manager (not admin)', async () => {
    renderWorldTab(false);
    const main = await rowOf('raskolnikov');
    expect(main.getByText('Not read')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /as read/ })).toBeNull();
  });

  it('the key of a saved entity is read-only, the key of a new one is editable', async () => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sonya' }));
    const card = within(await screen.findByRole('region', { name: 'Entity sonya' }));
    const key = (await card.findByLabelText('Key')) as HTMLInputElement;
    expect(key.value).toBe('sonya');
    expect(key.readOnly).toBe(true);
    expect((card.getByLabelText('Name') as HTMLInputElement).value).toBe('Sonya');

    fireEvent.click(card.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'New character' }));
    const fresh = within(await screen.findByRole('region', { name: 'New entity' }));
    expect((fresh.getByLabelText('Key') as HTMLInputElement).readOnly).toBe(false);
  });

  it('import: a dry run first, then the write checked against the newest updatedAt the list showed (R6)', async () => {
    renderWorldTab(true);
    await rowOf('sonya');
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Import world JSON' }), {
      target: { value: JSON.stringify(en) },
    });
    await waitFor(() => expect(rec.puts.map((p) => p.query)).toEqual(['?dryRun=true']));
    const confirm = await screen.findByRole('button', { name: 'Import' });
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirm);
    await waitFor(() => expect(rec.puts).toHaveLength(2));
    // Сверка R6 (15.11.2026): самый свежий updatedAt и число сущностей, которые видела вкладка.
    expect(rec.puts[1].query).toBe(
      `?expectedUpdatedAt=${encodeURIComponent(LIST_NEWEST)}&expectedCount=3`
    );
    expect((rec.puts[1].body as { entities: unknown[] }).entities).toHaveLength(en.entities.length);
  });

  /** Окно импорта одной сущности из карточки; JSON вставлен. */
  const importIntoCard = async (region: string, json: unknown) => {
    const card = within(await screen.findByRole('region', { name: region }));
    fireEvent.click(await card.findByRole('button', { name: 'Import JSON' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Import entity JSON' }), {
      target: { value: JSON.stringify(json) },
    });
  };

  const confirmImport = async () => {
    const confirm = await screen.findByRole('button', { name: 'Import' });
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirm);
  };

  it('one entity: a dry run, then PUT by the key of the card checked against what the card showed', async () => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sonya' }));
    await importIntoCard('Entity sonya', { language: 'en', type: 'character', short: 'New short' });
    await waitFor(() => expect(rec.entityPuts.map((p) => p.query)).toEqual(['?dryRun=true']));
    await confirmImport();
    await waitFor(() => expect(rec.entityPuts).toHaveLength(2));
    expect(rec.entityPuts.map((p) => p.key)).toEqual(['sonya', 'sonya']);
    expect(rec.entityPuts[1].query).toBe(`?expectedUpdatedAt=${encodeURIComponent(ENTITY_SEEN)}`);
    expect(rec.entityPuts[1].body).toEqual({
      language: 'en',
      type: 'character',
      short: 'New short',
    });
    // Импорт одной сущности не зовёт ручку всей версии.
    expect(rec.puts).toEqual([]);
  });

  it('F08-2: an import into the card that queued a recount shows «after the recount» (S5)', async () => {
    const base = detail('sonya');
    const pendingEntity = {
      ...base.entity,
      editor: { ...base.entity.editor!, recountPending: true },
    };
    rec.entityPutReply = (_key, _body, query) =>
      HttpResponse.json(
        query.includes('dryRun')
          ? { entity: null, hasCore: false, warnings: [], recountQueued: false }
          : { entity: pendingEntity, hasCore: false, warnings: [], recountQueued: true }
      );
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sonya' }));
    await importIntoCard('Entity sonya', {
      language: 'en',
      type: 'character',
      aliases: ['Sonya', 'Sonechka'],
    });
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    // Карточка после импорта перечитывается: сервер всё ещё держит строку очереди.
    rec.entityReply = () => HttpResponse.json({ ...base, entity: pendingEntity });
    await confirmImport();
    const card = within(await screen.findByRole('region', { name: 'Entity sonya' }));
    expect(await card.findByText(/Saved — presence will update after the recount/)).toBeTruthy();
  });

  it('one entity: another key in the JSON and form errors are refused on the client by their path', async () => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sonya' }));
    await importIntoCard('Entity sonya', { language: 'en', key: 'raskolnikov', type: 'character' });
    expect((await screen.findByRole('alert')).textContent).toContain(
      'key: JSON is "raskolnikov", the entity is "sonya"'
    );
    const quote = { text: 'q', chapter: 1, interpretation: 'i' };
    fireEvent.change(screen.getByRole('textbox', { name: 'Import entity JSON' }), {
      target: {
        value: JSON.stringify({
          language: 'en',
          type: 'character',
          quotes: Array.from({ length: 13 }, () => quote),
          extra: 1,
        }),
      },
    });
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('quotes:');
    expect(alert.textContent).toContain('extra: unknown key');
    expect(rec.entityPuts).toEqual([]);
  });

  it('one entity from a new card: the key comes from the JSON, an absent entity is checked as absent', async () => {
    renderWorldTab(true);
    await rowOf('sonya');
    fireEvent.click(screen.getByRole('button', { name: 'New character' }));
    await importIntoCard('New entity', {
      language: 'en',
      key: 'svidrigailov',
      type: 'character',
      name: 'Svidrigailov',
    });
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    await confirmImport();
    await waitFor(() => expect(rec.entityPuts).toHaveLength(2));
    expect(rec.entityPuts.map((p) => `${p.key}${p.query}`)).toEqual([
      'svidrigailov?dryRun=true',
      'svidrigailov?expectedAbsent=true',
    ]);
  });
});
