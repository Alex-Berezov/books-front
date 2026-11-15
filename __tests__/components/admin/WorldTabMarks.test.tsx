import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BookWorldListResponse, BookWorldSaveResponse } from '@/types/api-schema';
import en from '../../fixtures/example-world.en.json';
import {
  installWorldApi,
  json409,
  LIST,
  renderWorldTab,
  row,
  rowOf,
  type WorldApi,
  WORLD,
} from '../../helpers/worldApi';
import { server } from '../../msw/server';

/**
 * F08-1: вкладка World — только редакторам; флаги (pending, отказ — переключатель на значении
 * сервера); импорт всей версии (409 R6, отказ пробы); R9 — после импорта сущность «Not read»
 * и кнопка отметки у `admin` (круг /fix 1, п.2, 4, 9, 12).
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

const switchOf = (name: string) => screen.getByRole('switch', { name }) as HTMLButtonElement;

describe('WorldTab marks and import (F08-1)', () => {
  let rec: WorldApi;

  beforeAll(async () => {
    await import('@/lib/admin/book-world-validation');
  });

  beforeEach(() => {
    rec = installWorldApi();
  });

  it('a non-editor (lawyer) sees «Editors only» and the tab sends no request', async () => {
    const { client } = renderWorldTab(false, false);
    expect(await screen.findByText(/Editors only/)).toBeTruthy();
    // Признак, а не пауза: ни одного запроса вкладка не завела вовсе.
    expect(client.getQueryCache().getAll()).toEqual([]);
    expect(rec.gets).toEqual([]);
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('the session is still loading: a spinner, no stub and no request', () => {
    const { client } = renderWorldTab(true, null);
    expect(screen.queryByText(/Editors only/)).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
    expect(client.getQueryCache().getAll()).toEqual([]);
  });

  it('R9: the version import names the entities that were on the site', async () => {
    rec.putReply = () =>
      HttpResponse.json({ world: null, entities: [] } satisfies BookWorldSaveResponse);
    const published = row({ key: 'raskolnikov' }, { firstPublishedAt: '2026-11-01T00:00:00.000Z' });
    server.use(
      http.get(WORLD, () =>
        HttpResponse.json({
          language: 'en',
          entities: [published, ...LIST().slice(1)],
        } satisfies BookWorldListResponse)
      )
    );
    await openImport(en);
    expect(
      await screen.findByText(
        'These entities are on the site: raskolnikov. After saving, the page is hidden until an admin marks it read.'
      )
    ).toBeTruthy();
  });

  it('while a PATCH of an entity is in flight, its switches are disabled; others are not', async () => {
    let release: () => void = () => undefined;
    rec.flagsReply = (key, body) =>
      new Promise((resolve) => {
        release = () => resolve(HttpResponse.json(row({ key }, body as Record<string, boolean>)));
      });
    renderWorldTab(true);
    await rowOf('sonya');
    fireEvent.click(switchOf('Visible: sonya'));
    await waitFor(() => expect(switchOf('Indexed: sonya').disabled).toBe(true));
    expect(switchOf('Visible: sonya').disabled).toBe(true);
    expect(switchOf('Indexed: raskolnikov').disabled).toBe(false);
    release();
    await waitFor(() => expect(switchOf('Indexed: sonya').disabled).toBe(false));
  });

  it('a refused PATCH leaves the switch at the server value and says why', async () => {
    rec.flagsReply = () =>
      HttpResponse.json(
        { statusCode: 400, message: 'no flags', error: 'Bad Request' },
        { status: 400 }
      );
    renderWorldTab(true);
    await rowOf('sonya');
    fireEvent.click(switchOf('Visible: sonya'));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'sonya: could not change the flag: no flags'
    );
    expect(switchOf('Visible: sonya').getAttribute('aria-checked')).toBe('true');
  });

  const openImport = async (json: unknown) => {
    renderWorldTab(true);
    await rowOf('sonya');
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Import world JSON' }), {
      target: { value: JSON.stringify(json) },
    });
  };

  it('a refused dry run: the reasons are shown line by line, Import stays disabled', async () => {
    rec.putReply = () =>
      HttpResponse.json(
        { statusCode: 400, message: ['entities.0.quotes.1.text: not found verbatim'] },
        { status: 400 }
      );
    await openImport(en);
    expect(await screen.findByText('entities.0.quotes.1.text: not found verbatim')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Import' }) as HTMLButtonElement).disabled).toBe(
      true
    );
    expect(rec.puts.map((p) => p.query)).toEqual(['?dryRun=true']);
  });

  it('409 of the write (R6): the window says the world changed and the list is reloaded', async () => {
    rec.putReply = (_key, _body, query) =>
      query === '?dryRun=true'
        ? HttpResponse.json({
            world: null,
            entities: [{ key: 'raskolnikov', created: false, hasCore: false, warnings: [] }],
          } satisfies BookWorldSaveResponse)
        : json409('RECORD_CHANGED');
    await openImport(en);
    const confirm = await screen.findByRole('button', { name: 'Import' });
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
    const listGets = rec.gets.filter((g) => g === 'list').length;
    fireEvent.click(confirm);
    expect(await screen.findByText(/The world was changed on the server/)).toBeTruthy();
    await waitFor(() =>
      expect(rec.gets.filter((g) => g === 'list').length).toBeGreaterThan(listGets)
    );
  });

  it('R9: after the import the entity is «Not read» and the admin gets «Mark as read»', async () => {
    const IMPORTED = '2026-11-14T14:00:00.000Z';
    rec.putReply = (_key, _body, query) =>
      HttpResponse.json({
        world:
          query === '?dryRun=true'
            ? null
            : {
                language: 'en',
                // Импорт поставил autoTextAt=now: прежняя отметка о прочтении sonya его не покрывает.
                entities: LIST().map((e) =>
                  e.key === 'sonya' && e.editor
                    ? { ...e, editor: { ...e.editor, autoTextAt: IMPORTED } }
                    : e
                ),
              },
        entities: [{ key: 'sonya', created: false, hasCore: false, warnings: [] }],
      } satisfies BookWorldSaveResponse);
    await openImport(en);
    expect((await rowOf('sonya')).getByText('Read')).toBeTruthy();
    const confirm = await screen.findByRole('button', { name: 'Import' });
    await waitFor(() => expect((confirm as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(confirm);
    const sonya = await rowOf('sonya');
    expect(await sonya.findByText('Not read')).toBeTruthy();
    fireEvent.click(sonya.getByRole('button', { name: 'Mark sonya as read' }));
    await waitFor(() =>
      expect(rec.reads).toEqual([{ key: 'sonya', body: { autoTextAt: IMPORTED } }])
    );
  });
});
