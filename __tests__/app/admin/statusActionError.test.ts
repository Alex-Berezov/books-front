import { describe, it, expect } from 'vitest';
import { describeStatusFailure } from '@/app/admin/[lang]/rights-intakes/[id]/statusActionError';

/**
 * WP-M.2: сообщение бэкенда информативнее любого нашего текста — `Cannot transition from
 * 'DRAFT' to 'APPROVED'` называет причину, «не удалось» нет. Запасной текст берётся только
 * когда своего сообщения нет вовсе.
 */
describe('describeStatusFailure', () => {
  it('берёт сообщение бэкенда, когда оно есть', () => {
    expect(
      describeStatusFailure('markReady', new Error("Cannot transition from 'DRAFT'"), 'запасной')
    ).toEqual({ scope: 'markReady', message: "Cannot transition from 'DRAFT'" });
  });

  it('подставляет запасной текст у Error с пустым сообщением', () => {
    expect(describeStatusFailure('archive', new Error(''), 'запасной').message).toBe('запасной');
    expect(describeStatusFailure('archive', new Error('   '), 'запасной').message).toBe('запасной');
  });

  it('подставляет запасной текст, когда отброшено не Error', () => {
    expect(describeStatusFailure('returnToDraft', 'строка', 'запасной').message).toBe('запасной');
    expect(describeStatusFailure('returnToDraft', undefined, 'запасной').message).toBe('запасной');
  });

  it('запоминает, чьим было действие', () => {
    expect(describeStatusFailure('archive', new Error('x'), 'y').scope).toBe('archive');
  });
});
