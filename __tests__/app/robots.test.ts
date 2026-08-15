import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';

/**
 * `LEGACY-175`. Читалка и плеер закрыты входом, значит краулеру на этих адресах
 * делать нечего: он получает редирект на `/{lang}/auth/sign-in`, а `noindex,
 * follow` со страницы до него не доезжает вовсе — страницу закрывает редирект.
 *
 * ⚠️ Прежние запреты `/*​/read/*` и `/*​/listen/*` сюда не годятся: им нужна
 * подстрока `/read/`, а живые адреса выглядят как `/en/book/hamlet/read`.
 * Разрешающее `/*​/book/*` при этом приглашает краулер именно на них.
 */
describe('robots: закрытые входом читалка и плеер (LEGACY-175)', () => {
  const rules = robots().rules;
  const disallow = Array.isArray(rules) ? [] : ((rules.disallow as string[]) ?? []);
  const allow = Array.isArray(rules) ? [] : ((rules.allow as string[]) ?? []);

  it.each(['/*/book/*/read', '/*/book/*/read/*', '/*/book/*/listen', '/*/book/*/listen/*'])(
    'запрет %s на месте',
    (pattern) => {
      expect(disallow).toContain(pattern);
    }
  );

  // Родительская страница книги остаётся публичной и индексируемой — это то,
  // что аноним видит до входа, и единственный адрес книги в карте сайта.
  it('родительская страница книги из allow не выпала', () => {
    expect(allow).toContain('/*/book/*');
  });
});
