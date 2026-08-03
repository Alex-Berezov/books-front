import { describe, expect, it } from 'vitest';
import { bookCreationErrorMessage } from '@/components/admin/RightsIntakeDetail/CreateBookFromClearanceForm/bookCreationErrorLabels';

/**
 * WP-H: отказ создания книги несёт машинный код. Редактор должен видеть причину, а не
 * английскую строку сервера, и не пустоту, когда код бэкенду ещё неизвестен фронту.
 */
describe('bookCreationErrorMessage (WP-H)', () => {
  it('translates a known refusal code', () => {
    expect(
      bookCreationErrorMessage({ code: 'BOOK_CREATION_SLUG_TAKEN', messageRu: 'Слаг занят.' })
    ).toBe('Книга с таким слагом уже существует');
  });

  it('falls back to the Russian message of an unknown code', () => {
    expect(
      bookCreationErrorMessage({
        code: 'BOOK_CREATION_SOMETHING_NEW',
        messageRu: 'Новая причина от бэкенда.',
      })
    ).toBe('Новая причина от бэкенда.');
  });

  it('falls back to the exception message when the body carries no code', () => {
    expect(bookCreationErrorMessage(undefined, 'Request failed')).toBe('Request failed');
  });

  it('never renders an empty message', () => {
    expect(bookCreationErrorMessage({}, '')).toBe('Не удалось создать книгу');
  });
});
