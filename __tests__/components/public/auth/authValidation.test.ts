import { describe, expect, it } from 'vitest';
import { isValidEmail } from '@/components/public/auth';

/**
 * `isValidEmail` повторяет правило `{ type: 'email' }` antd (`LEGACY-442`).
 * Не-ASCII диапазоны домена в шаблоне начинаются с неразрывного пробела
 * ` `: если его заменить обычным пробелом, в домен пройдёт вся печатная
 * ASCII от пробела до `~` — это и ловит проверка с `!` в домене.
 */
describe('isValidEmail', () => {
  it('пропускает обычный адрес', () => {
    expect(isValidEmail('reader@example.com')).toBe(true);
  });

  it('пропускает адрес с кириллическим доменом', () => {
    expect(isValidEmail('reader@пример.рф')).toBe(true);
  });

  it('пропускает `!` в локальной части, как правило antd', () => {
    expect(isValidEmail('a!b@c.de')).toBe(true);
  });

  it('отбивает ASCII-знак вне списка в домене', () => {
    expect(isValidEmail('reader@ex!ample.com')).toBe(false);
    expect(isValidEmail('a@b!c.de')).toBe(false);
    expect(isValidEmail('reader@exa mple.com')).toBe(false);
  });

  it('отбивает адрес без домена верхнего уровня и без собаки', () => {
    expect(isValidEmail('reader@example')).toBe(false);
    expect(isValidEmail('reader@')).toBe(false);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('отбивает адрес длиннее 320 знаков', () => {
    const local = 'a'.repeat(64);
    const domain = `${'b'.repeat(260)}.com`;
    expect(isValidEmail(`${local}@${domain}`)).toBe(false);
    expect(isValidEmail(`${local}@${'b'.repeat(200)}.com`)).toBe(true);
  });
});
