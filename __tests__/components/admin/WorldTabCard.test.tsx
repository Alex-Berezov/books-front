import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookWorldQueryKeys } from '@/api/hooks';
import type { BookWorldEntitySaveResponse } from '@/types/api-schema';
import {
  cardOf,
  detail,
  ENTITY_SEEN,
  installWorldApi,
  json409,
  renderWorldTab,
  rowOf,
  type WorldApi,
} from '../../helpers/worldApi';

/**
 * F08-1: карточка героя вкладки World — запись (создание, правка, 400 с путём), удаление (204,
 * 409 PUBLISHED, 409 REFERENCED), занятый ключ новой сущности, предупреждения после создания,
 * отказ перечитывания, своя отметка двигает сверку (круг /fix 1, п.1, 3, 5, 6, 12).
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() => Promise.resolve({ user: { id: 'u1' }, expires: '2099-01-01' })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: vi.fn() }) }));

const saved = (patch: Partial<BookWorldEntitySaveResponse> = {}) =>
  HttpResponse.json({
    entity: detail('sonya').entity,
    hasCore: false,
    warnings: [],
    ...patch,
  } satisfies BookWorldEntitySaveResponse);

describe('WorldTab entity card (F08-1)', () => {
  let rec: WorldApi;

  beforeAll(async () => {
    await import('@/lib/admin/book-world-validation');
  });

  beforeEach(() => {
    rec = installWorldApi();
  });

  const openSonya = async () => {
    renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sonya' }));
    return cardOf('Entity sonya');
  };

  const openNew = async (key: string, name: string) => {
    renderWorldTab(true);
    await rowOf('sonya');
    fireEvent.click(screen.getByRole('button', { name: 'New character' }));
    const card = await cardOf('New entity');
    fireEvent.change(card.getByLabelText('Key'), { target: { value: key } });
    fireEvent.change(card.getByLabelText('Name'), { target: { value: name } });
    return card;
  };

  it('edit: PUT by the key checked against the updatedAt the card showed', async () => {
    rec.entityPutReply = () => saved();
    const card = await openSonya();
    fireEvent.change(await card.findByLabelText('Short'), { target: { value: 'New short' } });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].key).toBe('sonya');
    expect(rec.entityPuts[0].query).toBe(`?expectedUpdatedAt=${encodeURIComponent(ENTITY_SEEN)}`);
    expect(rec.entityPuts[0].body).toMatchObject({ language: 'en', short: 'New short' });
    // Сохранённая сущность пришла в ответе: второго GET карточки нет, перечитывается только список.
    await waitFor(() => expect(rec.gets.filter((g) => g === 'list').length).toBeGreaterThan(1));
    expect(rec.gets.filter((g) => g === 'sonya')).toHaveLength(1);
  });

  it('create: PUT by the typed key with expectedAbsent; the warnings survive reopening the card', async () => {
    rec.entityPutReply = () =>
      saved({
        warnings: [{ code: 'core_incomplete', path: 'quotes', message: 'at least 3 quotes' }],
      });
    const card = await openNew('svidrigailov', 'Svidrigailov');
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].key).toBe('svidrigailov');
    expect(rec.entityPuts[0].query).toBe('?expectedAbsent=true');
    // Карточка открылась заново по ключу новой сущности — итог записи с ней.
    const reopened = await cardOf('Entity svidrigailov');
    expect(await reopened.findByText('quotes: at least 3 quotes')).toBeTruthy();
  });

  it('create with a taken key: the error is at the key field, not «changed on the server»', async () => {
    rec.entityPutReply = () => json409('RECORD_CHANGED');
    const card = await openNew('sonya', 'Sonya');
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    expect(await card.findByText('key: key is taken')).toBeTruthy();
    expect(card.queryByText(/changed on the server since it was opened/)).toBeNull();
    expect(card.queryByRole('button', { name: 'Reload' })).toBeNull();
  });

  it('a 400 of the server is shown line by line with the field paths', async () => {
    rec.entityPutReply = () =>
      HttpResponse.json(
        {
          statusCode: 400,
          message: [
            'quotes.0.text: not found verbatim in chapter 1',
            'relations.0.to: unknown key',
          ],
          error: 'Bad Request',
        },
        { status: 400 }
      );
    const card = await openSonya();
    fireEvent.click(await card.findByRole('button', { name: 'Save entity' }));
    expect(await card.findByText('quotes.0.text: not found verbatim in chapter 1')).toBeTruthy();
    expect(card.getByText('relations.0.to: unknown key')).toBeTruthy();
  });

  it('a failed reload keeps «changed on the server» and shows why', async () => {
    rec.entityPutReply = () => json409('RECORD_CHANGED');
    const card = await openSonya();
    fireEvent.click(await card.findByRole('button', { name: 'Save entity' }));
    const reload = await card.findByRole('button', { name: 'Reload' });
    rec.entityReply = () =>
      HttpResponse.json({ statusCode: 404, message: 'Entity not found' }, { status: 404 });
    fireEvent.click(reload);
    expect(await card.findByText(/Could not reload: Entity not found/)).toBeTruthy();
    expect(card.getByRole('button', { name: 'Reload' })).toBeTruthy();
    expect((card.getByRole('button', { name: 'Save entity' }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it('R6: a flag does not move the check — after another editor saved, the next save is 409 → stale', async () => {
    // Сценарий ревью r2: А открыл карточку, Б сохранил сущность, А снял «показывать» и сохранил.
    // Ответ флага несёт чужой updatedAt — карточка его не подставляет, сервер отвечает 409.
    rec.entityPutReply = () => json409('RECORD_CHANGED');
    const card = await openSonya();
    await card.findByLabelText('Short');
    fireEvent.click(screen.getByRole('switch', { name: 'Visible: sonya' }));
    expect(await card.findByText(/Visible: no/)).toBeTruthy();
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].query).toBe(`?expectedUpdatedAt=${encodeURIComponent(ENTITY_SEEN)}`);
    expect(await card.findByText(/changed on the server since it was opened/)).toBeTruthy();
  });

  it('R6: a background reload of the entity does not move the check of the open form', async () => {
    // Б сохранил сущность, у А кэш карточки перечитался (фокус окна): форма А сверяется по тому,
    // что показала, и её запись получит 409, а не тихо затрёт правку Б.
    const { client } = renderWorldTab(true);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sonya' }));
    const card = await cardOf('Entity sonya');
    await card.findByLabelText('Short');
    rec.entityReply = (key) => {
      const res = detail(key);
      res.entity.updatedAt = '2026-11-14T15:00:00.000Z';
      return HttpResponse.json(res);
    };
    await client.invalidateQueries({ queryKey: bookWorldQueryKeys.entity('v1', 'sonya') });
    await waitFor(() => expect(rec.gets.filter((g) => g === 'sonya')).toHaveLength(2));
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].query).toBe(`?expectedUpdatedAt=${encodeURIComponent(ENTITY_SEEN)}`);
  });

  it('R9: a card of an entity that was on the site warns that saving hides the page until read', async () => {
    rec.entityReply = (key) => {
      const res = detail(key);
      res.entity.editor = { ...res.entity.editor!, firstPublishedAt: '2026-11-01T00:00:00.000Z' };
      return HttpResponse.json(res);
    };
    const card = await openSonya();
    expect(
      await card.findByText('After saving, the page is hidden until an admin marks it read.')
    ).toBeTruthy();
  });

  it('R9: a card of an entity never on the site has no such warning', async () => {
    const card = await openSonya();
    await card.findByLabelText('Short');
    expect(card.queryByText(/page is hidden until an admin marks it read/)).toBeNull();
  });

  it('delete: 204 closes the card', async () => {
    const card = await openSonya();
    fireEvent.click(await card.findByRole('button', { name: 'Delete' }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' })
    );
    await waitFor(() => expect(rec.deletes).toEqual(['sonya']));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Entity sonya' })).toBeNull());
  });

  it.each([
    ['WORLD_ENTITY_PUBLISHED', /is or was public on the site/],
    ['WORLD_ENTITY_REFERENCED', /Other entities refer to this one/],
  ])('delete refused with 409 %s: the reason is shown, the card stays', async (code, text) => {
    rec.deleteReply = () => json409(code);
    const card = await openSonya();
    fireEvent.click(await card.findByRole('button', { name: 'Delete' }));
    fireEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' })
    );
    expect(await screen.findByText(text)).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Entity sonya' })).toBeTruthy();
  });
});
