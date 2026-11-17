import { describe, expect, it } from 'vitest';
import {
  worldDeleteErrorText,
  worldReadErrorText,
  worldPublicPath,
  worldReadState,
} from '@/components/admin/books/WorldTab/worldErrors';
import { ApiError } from '@/types/api';

/** F08-1: состояние отметки «прочитано» и тексты отказов отметки и удаления. */

const AT = '2026-11-14T10:00:00.000Z';
const editor = (readAt: string | null, autoTextAt: string | null) => ({
  isVisible: true,
  isListed: false,
  readAt,
  autoTextAt,
  firstPublishedAt: null,
  missing: [],
  mentionChapters: null,
});

describe('worldReadState', () => {
  it('no model text — none, whatever the mark', () => {
    expect(worldReadState(editor(null, null))).toBe('none');
    expect(worldReadState(editor(AT, null))).toBe('none');
  });

  it('the boundary readAt >= autoTextAt: equal is read, a millisecond earlier is not', () => {
    expect(worldReadState(editor(AT, AT))).toBe('read');
    expect(worldReadState(editor('2026-11-14T09:59:59.999Z', AT))).toBe('unread');
    expect(worldReadState(editor('2026-11-14T10:00:00.001Z', AT))).toBe('read');
    expect(worldReadState(editor(null, AT))).toBe('unread');
  });
});

describe('world refusal texts', () => {
  const conflict = (code: string) =>
    new ApiError({ statusCode: 409, message: 'refused', data: { code } });

  it('read and delete codes have their own text; others fall back to the server message', () => {
    expect(worldReadErrorText(conflict('AUTO_TEXT_NONE'))).toMatch(/no model text/);
    expect(worldReadErrorText(conflict('WORLD_TEXT_CHANGED'))).toMatch(/model text changed/);
    expect(worldDeleteErrorText(conflict('WORLD_ENTITY_PUBLISHED'))).toMatch(/public on the site/);
    expect(worldDeleteErrorText(conflict('WORLD_ENTITY_REFERENCED'))).toMatch(/refer to this one/);
    expect(worldDeleteErrorText(conflict('OTHER'))).toBe('Could not delete: refused');
  });
});

describe('worldPublicPath: адрес публичной страницы сущности для админки', () => {
  const listed = { key: 'ophelia', editor: { isListed: true } } as Parameters<
    typeof worldPublicPath
  >[1];
  const unlisted = { key: 'ophelia', editor: { isListed: false } } as Parameters<
    typeof worldPublicPath
  >[1];
  const published = { language: 'fr', slug: 'hamlet-fr', status: 'published' };

  it('версия опубликована, слаг есть, сущность в списке - адрес по слагу версии', () => {
    expect(worldPublicPath(published, listed)).toBe('/fr/book/hamlet-fr/wiki/ophelia');
  });

  it('черновик, нет слага или сущность не в списке - страницы нет', () => {
    expect(worldPublicPath({ ...published, status: 'draft' }, listed)).toBeNull();
    expect(worldPublicPath({ ...published, slug: null }, listed)).toBeNull();
    expect(worldPublicPath(published, unlisted)).toBeNull();
  });
});
