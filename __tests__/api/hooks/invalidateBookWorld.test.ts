import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { bookWorldQueryKeys, invalidateBookWorld } from '@/api/hooks/useBookWorld';

/**
 * F08-2: пересчёт присутствия ставится на всю версию — после записи сущности, правки главы
 * или записи перевода в главу вкладка World перечитывает список и карточки соседей; своя карточка
 * записи уже лежит в кэше из ответа и не перечитывается.
 */
const seeded = () => {
  const client = new QueryClient();
  client.setQueryData(bookWorldQueryKeys.list('v1'), { entities: [] });
  client.setQueryData(bookWorldQueryKeys.entity('v1', 'a'), { entity: { key: 'a' } });
  client.setQueryData(bookWorldQueryKeys.entity('v1', 'b'), { entity: { key: 'b' } });
  client.setQueryData(bookWorldQueryKeys.entity('v2', 'c'), { entity: { key: 'c' } });
  return client;
};
const invalidated = (client: QueryClient, key: readonly unknown[]) =>
  client.getQueryState(key)?.isInvalidated;

describe('invalidateBookWorld (F08-2)', () => {
  it('list and every card of the version; other versions untouched', () => {
    const client = seeded();
    invalidateBookWorld(client, 'v1');
    expect(invalidated(client, bookWorldQueryKeys.list('v1'))).toBe(true);
    expect(invalidated(client, bookWorldQueryKeys.entity('v1', 'a'))).toBe(true);
    expect(invalidated(client, bookWorldQueryKeys.entity('v1', 'b'))).toBe(true);
    expect(invalidated(client, bookWorldQueryKeys.entity('v2', 'c'))).toBe(false);
  });

  it('the card of the save itself stays as the response put it', () => {
    const client = seeded();
    invalidateBookWorld(client, 'v1', 'a');
    expect(invalidated(client, bookWorldQueryKeys.entity('v1', 'a'))).toBe(false);
    expect(invalidated(client, bookWorldQueryKeys.entity('v1', 'b'))).toBe(true);
    expect(invalidated(client, bookWorldQueryKeys.list('v1'))).toBe(true);
  });
});
