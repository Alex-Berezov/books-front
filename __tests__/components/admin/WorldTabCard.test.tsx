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
    recountQueued: false,
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

  it('F08-2: presence is read-only from the count; stale items are flagged; exclusions are sent', async () => {
    const base = detail('sonya');
    rec.entityReply = () =>
      HttpResponse.json({
        ...base,
        entity: {
          ...base.entity,
          mentions: {
            chapters: [1, 2],
            first: 1,
            perChapter: [
              { chapter: 1, count: 3 },
              { chapter: 2, count: 1 },
            ],
            coPresence: [],
          },
          editor: { ...base.entity.editor!, aliasExclusions: ['sonnet'], stale: ['quotes.2'] },
        },
      });
    rec.entityPutReply = () => saved();
    const card = await openSonya();
    expect(await card.findByText(/2 chapters, first: 1/)).toBeTruthy();
    expect(card.getByText(/Chapters: 1 \(3\), 2 \(1\)/)).toBeTruthy();
    const stale = card.getByText(/No longer matches the chapter text/).closest('div')!;
    expect(within(stale as HTMLElement).getByText('quotes.2')).toBeTruthy();
    // Присутствие не поле ввода: его считает бэкенд.
    const presence = card.getByText('Presence').parentElement!;
    expect(presence.textContent).toContain('2 chapters, first: 1');
    expect(presence.querySelectorAll('input, textarea, select')).toHaveLength(0);

    const exclusions = card.getByLabelText('Excluded name forms (one per line)');
    expect((exclusions as HTMLTextAreaElement).value).toBe('sonnet');
    fireEvent.change(exclusions, { target: { value: 'sonnet\n  sun  ' } });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].body).toMatchObject({ aliasExclusions: ['sonnet', 'sun'] });
  });

  it('F08-2: exclusions cleared in the form go as null', async () => {
    rec.entityPutReply = () => saved();
    const base = detail('sonya');
    rec.entityReply = () =>
      HttpResponse.json({
        ...base,
        entity: { ...base.entity, editor: { ...base.entity.editor!, aliasExclusions: ['sonnet'] } },
      });
    const card = await openSonya();
    const exclusions = await card.findByLabelText('Excluded name forms (one per line)');
    fireEvent.change(exclusions, { target: { value: '  ' } });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].body).toHaveProperty('aliasExclusions', null);
  });

  it('F08-2: a card without exclusions from the server does not wipe them on save', async () => {
    rec.entityPutReply = () => saved();
    const base = detail('sonya');
    const { aliasExclusions: _dropped, ...editorWithout } = base.entity.editor!;
    rec.entityReply = () =>
      HttpResponse.json({ ...base, entity: { ...base.entity, editor: editorWithout } });
    const card = await openSonya();
    fireEvent.change(await card.findByLabelText('Short'), { target: { value: 'New short' } });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].body).not.toHaveProperty('aliasExclusions');
  });

  it('F08-2: a saved entity not counted yet says the recount is coming', async () => {
    const base = detail('sonya');
    rec.entityReply = () =>
      HttpResponse.json({ ...base, entity: { ...base.entity, mentions: null } });
    const card = await openSonya();
    expect(await card.findByText(/Not counted yet — the recount runs shortly/)).toBeTruthy();
    expect(card.getByRole('button', { name: 'Reload presence' })).toBeTruthy();
    expect(card.queryByText('Counted after the first save')).toBeNull();
  });

  it('F08-2: a version without chapters: the reason is the missing text, not the name forms', async () => {
    const base = detail('sonya');
    rec.entityReply = () =>
      HttpResponse.json({
        ...base,
        chapterNumbers: [],
        entity: {
          ...base.entity,
          mentions: { chapters: [], first: null, perChapter: [], coPresence: [] },
        },
      });
    const card = await openSonya();
    expect(
      await card.findByText(
        'The version has no chapters yet — presence is counted from chapter text'
      )
    ).toBeTruthy();
    expect(card.queryByText('Not found in any chapter — check name forms')).toBeNull();
  });

  it('F08-2: one chapter is «1 chapter»', async () => {
    const base = detail('sonya');
    rec.entityReply = () =>
      HttpResponse.json({
        ...base,
        entity: {
          ...base.entity,
          mentions: {
            chapters: [2],
            first: 2,
            perChapter: [{ chapter: 2, count: 1 }],
            coPresence: [],
          },
        },
      });
    const card = await openSonya();
    expect(await card.findByText(/^1 chapter, first: 2/)).toBeTruthy();
  });

  it('F08-2: a new entity is counted after the first save; its body sends exclusions as null', async () => {
    rec.entityPutReply = () => saved();
    const card = await openNew('olga', 'Olga');
    expect(card.getByText('Counted after the first save')).toBeTruthy();
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    // Новая сущность: исключений нет, `null` — «пусто» (бэкенд принимает, `update-book-world.dto.ts`).
    expect(rec.entityPuts[0].body).toHaveProperty('aliasExclusions', null);
  });

  it('F08-2: no stale items — no warning block', async () => {
    const card = await openSonya();
    await card.findByLabelText('Excluded name forms (one per line)');
    expect(card.queryByText(/No longer matches the chapter text/)).toBeNull();
  });

  it('F08-2: a flag in the list keeps the card fields of the entity page (exclusions, stale)', async () => {
    const base = detail('sonya');
    rec.entityReply = () =>
      HttpResponse.json({
        ...base,
        entity: {
          ...base.entity,
          editor: { ...base.entity.editor!, aliasExclusions: ['sonnet'], stale: ['quotes.2'] },
        },
      });
    const card = await openSonya();
    expect(await card.findByText('quotes.2')).toBeTruthy();
    fireEvent.click(screen.getByRole('switch', { name: 'Visible: sonya' }));
    await waitFor(() => expect(rec.flags).toHaveLength(1));
    // Ответ флага — строка списка без полей страницы сущности: кэш карточки их не теряет.
    await waitFor(() => expect(card.getByText('quotes.2')).toBeTruthy());
    fireEvent.click(card.getAllByRole('button', { name: 'Close' })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit sonya' }));
    const reopened = await cardOf('Entity sonya');
    expect(
      (
        (await reopened.findByLabelText(
          'Excluded name forms (one per line)'
        )) as HTMLTextAreaElement
      ).value
    ).toBe('sonnet');
  });

  it('F08-2: a save that queued a recount shows «after the recount» until Reload finds the queue empty (S5)', async () => {
    const base = detail('sonya');
    const withPending = (recountPending: boolean) => ({
      ...base.entity,
      editor: { ...base.entity.editor!, recountPending },
    });
    rec.entityPutReply = () => saved({ entity: withPending(true), recountQueued: true });
    const card = await openSonya();
    fireEvent.change(await card.findByLabelText('Name forms (one per line)'), {
      target: { value: 'Sonya\nSonechka' },
    });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    expect(await card.findByText(/Saved — presence will update after the recount/)).toBeTruthy();

    // Пересчёт прошёл, присутствие не изменилось (`mentionsAt` прежний, Q4): строки очереди
    // больше нет — Reload снимает метку.
    rec.entityReply = () => HttpResponse.json({ ...base, entity: withPending(false) });
    const gets = rec.gets.filter((g) => g === 'sonya').length;
    fireEvent.click(card.getByRole('button', { name: 'Reload presence' }));
    await waitFor(() => expect(rec.gets.filter((g) => g === 'sonya').length).toBe(gets + 1));
    await waitFor(() =>
      expect(card.queryByText(/Saved — presence will update after the recount/)).toBeNull()
    );
    expect(card.getByText(/2 chapters, first: 1/)).toBeTruthy();
  });

  it('F08-2: Reload while the recount is still queued keeps the label; a failed Reload says so (S5)', async () => {
    const base = detail('sonya');
    const withPending = (recountPending: boolean) => ({
      ...base.entity,
      editor: { ...base.entity.editor!, recountPending },
    });
    rec.entityPutReply = () => saved({ entity: withPending(true), recountQueued: true });
    const card = await openSonya();
    fireEvent.change(await card.findByLabelText('Name forms (one per line)'), {
      target: { value: 'Sonya\nSonechka' },
    });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    expect(await card.findByText(/Saved — presence will update after the recount/)).toBeTruthy();

    rec.entityReply = () => HttpResponse.json({ ...base, entity: withPending(true) });
    const gets = rec.gets.filter((g) => g === 'sonya').length;
    fireEvent.click(card.getByRole('button', { name: 'Reload presence' }));
    await waitFor(() => expect(rec.gets.filter((g) => g === 'sonya').length).toBe(gets + 1));
    expect(card.getByText(/Saved — presence will update after the recount/)).toBeTruthy();

    rec.entityReply = () => HttpResponse.json({ message: 'down' }, { status: 503 });
    fireEvent.click(card.getByRole('button', { name: 'Reload presence' }));
    expect(await card.findByText(/Could not reload/)).toBeTruthy();
    expect(card.getByText(/Saved — presence will update after the recount/)).toBeTruthy();
  });

  it('F08-2: exclusions typed into a card the server sent none for are sent', async () => {
    rec.entityPutReply = () => saved();
    const base = detail('sonya');
    const { aliasExclusions: _dropped, ...editorWithout } = base.entity.editor!;
    rec.entityReply = () =>
      HttpResponse.json({ ...base, entity: { ...base.entity, editor: editorWithout } });
    const card = await openSonya();
    fireEvent.change(await card.findByLabelText('Excluded name forms (one per line)'), {
      target: { value: 'sonnet' },
    });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    await waitFor(() => expect(rec.entityPuts).toHaveLength(1));
    expect(rec.entityPuts[0].body).toMatchObject({ aliasExclusions: ['sonnet'] });
  });

  it('F08-2: a save the backend did not queue is not «Saved», even with edited name forms (S5, S6)', async () => {
    // Бэкенд сравнивает итоговые формы (S7): правка регистра пересчёт не ставит. Строка очереди
    // у версии при этом есть (правка главы) — метка без «Saved».
    const base = detail('sonya');
    const pendingEntity = {
      ...base.entity,
      editor: { ...base.entity.editor!, recountPending: true },
    };
    rec.entityPutReply = () => saved({ entity: pendingEntity, recountQueued: false });
    const card = await openSonya();
    fireEvent.change(await card.findByLabelText('Name forms (one per line)'), {
      target: { value: 'sonya' },
    });
    fireEvent.click(card.getByRole('button', { name: 'Save entity' }));
    expect(await card.findByText(/^Presence will update after the recount/)).toBeTruthy();
    expect(card.queryByText(/Saved — presence will update after the recount/)).toBeNull();
  });

  it('F08-2: an entity not found in any chapter says so', async () => {
    const base = detail('sonya');
    rec.entityReply = () =>
      HttpResponse.json({
        ...base,
        entity: {
          ...base.entity,
          mentions: { chapters: [], first: null, perChapter: [], coPresence: [] },
        },
      });
    const card = await openSonya();
    expect(await card.findByText('Not found in any chapter — check name forms')).toBeTruthy();
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
