// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { userDisplayName } from '@/lib/utils/user-name';

/**
 * Порядок предпочтения имени в админке (`LEGACY-380`). Сервер отдаёт `name`, `firstName`,
 * `lastName` и `nickname`, любое из которых может быть `null`, а отображаемого имени
 * не отдаёт вовсе. Порядок здесь и есть поведение: перестановка уровней меняет то,
 * что видит администратор, и не ловится ничем, кроме этих кейсов.
 */
describe('userDisplayName', () => {
  const base = { name: null, firstName: null, lastName: null, nickname: null, email: 'a@b.c' };

  it('предпочитает полное имя из двух частей', () => {
    expect(
      userDisplayName({ ...base, name: 'Игнорируемое', firstName: 'Марк', lastName: 'Твен' })
    ).toBe('Марк Твен');
  });

  it('берёт единое имя, когда частей нет', () => {
    expect(userDisplayName({ ...base, name: 'Марк Твен', nickname: 'mark' })).toBe('Марк Твен');
  });

  it('берёт одну заполненную часть, когда второй нет', () => {
    expect(userDisplayName({ ...base, firstName: 'Марк', nickname: 'mark' })).toBe('Марк');
    expect(userDisplayName({ ...base, lastName: 'Твен', nickname: 'mark' })).toBe('Твен');
  });

  it('берёт никнейм, когда имени нет ни в каком виде', () => {
    expect(userDisplayName({ ...base, nickname: 'booklover' })).toBe('booklover');
  });

  it('падает на почту, когда пусто всё остальное', () => {
    expect(userDisplayName(base)).toBe('a@b.c');
  });

  it('не принимает пробелы за имя', () => {
    expect(userDisplayName({ ...base, name: '   ', firstName: '  ', nickname: '\t' })).toBe(
      'a@b.c'
    );
  });
});
