import { describe, it, expect } from 'vitest';
import { metadata as listenMetadata } from '@/app/[lang]/book/[slug]/listen/page';
import { metadata as readMetadata } from '@/app/[lang]/book/[slug]/read/page';
import { metadata as summaryMetadata } from '@/app/[lang]/summary/[bookSlug]/[versionId]/page';
import robots from '@/app/robots';

/**
 * Читалка, плеер и саммари открыты анониму с 22.08.2026 и при этом не
 * индексируются. Держит их вне выдачи ровно один механизм — `noindex, follow`
 * в метаданных страницы, и работает он, только если краулер до страницы
 * доходит.
 *
 * 🔴 Отсюда посадка из двух половин. Вернуть запрет в `robots.txt` — значит
 * закрыть краулеру доступ к метатегу: адрес, на который ведут ссылки с
 * публичной страницы книги, попадёт в выдачу голой строкой. Убрать `noindex`
 * со страницы — значит пустить в индекс весь текст книги. Каждая половина по
 * отдельности выглядит безобидно, поэтому проверяются обе.
 */
describe('читалка, плеер и саммари: открыты краулеру, закрыты для индекса', () => {
  const rules = robots().rules;
  const disallow = Array.isArray(rules) ? [] : ((rules.disallow as string[]) ?? []);
  const allow = Array.isArray(rules) ? [] : ((rules.allow as string[]) ?? []);

  it.each([
    '/en/book/hamlet/read',
    '/en/book/hamlet/listen',
    '/en/summary/hamlet/v1',
    '/en/read/hamlet',
    '/en/listen/hamlet',
  ])('адрес %s ни под один запрет не подпадает', (path) => {
    const blocking = disallow.filter((pattern) => matchesGlob(pattern, path));

    expect(blocking).toEqual([]);
  });

  it.each([
    ['читалка', readMetadata],
    ['плеер', listenMetadata],
    ['саммари', summaryMetadata],
  ])('%s помечена noindex', (_name, metadata) => {
    expect(metadata.robots).toBe('noindex, follow');
  });

  it('родительская страница книги из allow не выпала', () => {
    expect(allow).toContain('/*/book/*');
  });
});

/**
 * Совпадение пути с шаблоном `robots.txt`: `*` — любой отрезок, якорь на начало,
 * завершающий `$` — якорь на конец.
 *
 * `$` разбирается намеренно: запрет вида `/*​/book/*​/read$` — форма из
 * документации самого Google, и без этой ветки он читался бы как поиск литерала
 * `$`, никогда не совпадал и оставлял тест зелёным при закрытом от краулера
 * адресе.
 */
function matchesGlob(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const parts = body.split('*');
  let cursor = 0;

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    if (part === '') continue;

    const found = i === 0 ? (path.startsWith(part) ? 0 : -1) : path.indexOf(part, cursor);
    if (found === -1) return false;
    cursor = found + part.length;
  }

  if (anchored && !body.endsWith('*')) return cursor === path.length;

  return true;
}
