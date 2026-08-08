import { beforeEach, describe, expect, it } from 'vitest';
import { clearLoggedInMarker, hasLoggedInMarker, markLoggedIn } from '@/lib/auth/sessionMarker';

/**
 * Посадки под баг 08.08.2026: вход через Google проходил, сессия создавалась, а
 * шапка сайта показывала «Sign In». Причина — отметку `logged_in` ставила только
 * парольная форма, а `AppProviders` по её отсутствию сообщал `SessionProvider`
 * «точно не залогинен», и тот не спрашивал сервер до планового опроса (15 минут).
 *
 * Здесь проверяется сам механизм отметки. Того, что её ставят **все** пути входа,
 * тест на модуле проверить не может — это гарантируется тем, что строки куки
 * больше нигде нет: единственные обращения к `logged_in` живут в `sessionMarker`.
 */
describe('logged-in marker', () => {
  beforeEach(() => {
    clearLoggedInMarker();
  });

  it('is absent for a fresh visitor', () => {
    expect(hasLoggedInMarker()).toBe(false);
  });

  it('is present after a sign-in', () => {
    markLoggedIn();
    expect(hasLoggedInMarker()).toBe(true);
  });

  it('is gone after a sign-out', () => {
    markLoggedIn();
    clearLoggedInMarker();
    expect(hasLoggedInMarker()).toBe(false);
  });

  it('does not confuse a different cookie whose name merely contains the marker', () => {
    // `not_logged_in=1` не должен читаться как отметка: проверка идёт по началу
    // имени куки, а не по вхождению подстроки.
    document.cookie = 'not_logged_in=1; path=/';
    expect(hasLoggedInMarker()).toBe(false);
    document.cookie = 'not_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  });
});
