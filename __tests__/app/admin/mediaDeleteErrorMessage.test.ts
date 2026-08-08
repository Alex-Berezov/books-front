import { describe, expect, it } from 'vitest';
import { deleteErrorMessage } from '@/app/admin/[lang]/media/deleteErrorMessage';
import { ApiError } from '@/types/api';

/**
 * LEGACY-060. Бэкенд отказывает удалять файл, на который ещё ссылаются, и
 * перечисляет ссылки. Прежний обработчик показывал «Failed to delete file» и
 * выбрасывал это перечисление — оператор узнавал, что что-то не так, и не узнавал,
 * что с этим делать.
 */
describe('deleteErrorMessage', () => {
  it('names what blocks the deletion', () => {
    const error = new ApiError({
      message: 'Media is still referenced and was not deleted',
      statusCode: 409,
      error: 'Conflict',
      data: { references: ['book version "War and Peace" (v1)', 'audio chapter "Ch 1" (a1)'] },
    });

    expect(deleteErrorMessage(error)).toBe(
      'Media is still referenced and was not deleted: book version "War and Peace" (v1), audio chapter "Ch 1" (a1)'
    );
  });

  it('falls back to the server message when there is no reference list', () => {
    const error = new ApiError({ message: 'Media not found', statusCode: 404 });
    expect(deleteErrorMessage(error)).toBe('Media not found');
  });

  it('ignores a malformed reference list instead of rendering it', () => {
    const error = new ApiError({
      message: 'Media is still referenced and was not deleted',
      statusCode: 409,
      data: { references: [{ nope: true }] },
    });
    expect(deleteErrorMessage(error)).toBe('Media is still referenced and was not deleted');
  });

  it('stays generic for anything that is not an API error', () => {
    expect(deleteErrorMessage(new Error('socket hang up'))).toBe('Failed to delete file');
    expect(deleteErrorMessage(undefined)).toBe('Failed to delete file');
  });
});
