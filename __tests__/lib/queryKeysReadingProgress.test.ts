import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/queryClient';

/**
 * Ключ кэша прогресса обязан включать владельца.
 *
 * 🔴 Общий компьютер. Читатель A слушает книгу и выходит; читатель B входит в
 * пределах `gcTime` и открывает ту же книгу. Без `userId` в ключе плеер поднимет
 * позицию A из кэша, восстановит по ней место и через пять секунд запишет её в
 * аккаунт B. Ошибки при этом нет ни одной — есть чужая закладка в чужом аккаунте.
 *
 * 🔴 Тест нужен именно здесь: во всех тестах читалки, плеера и полки сам хук
 * `useProgress` замокан целиком, поэтому потерянный `userId` в ключе не покраснеет
 * больше нигде. Соседний `readerBootstrap` держит владельца в ключе по той же
 * причине (`LEGACY-088`).
 */
describe('queryKeys.readingProgress', () => {
  it('различает читателей одной и той же книги', () => {
    expect(queryKeys.readingProgress('v1', 'user-a')).not.toEqual(
      queryKeys.readingProgress('v1', 'user-b')
    );
  });

  it('владелец стоит в ключе после версии', () => {
    expect(queryKeys.readingProgress('v1', 'user-a')).toEqual(['readingProgress', 'v1', 'user-a']);
  });

  /**
   * Префикс `['readingProgress', versionId]` — то, чем инвалидируют обе мутации
   * прогресса. Смена порядка сегментов молча сломала бы инвалидацию: запрос
   * остался бы со старым снимком, а плеер восстановился бы по нему.
   */
  it('версия стоит раньше владельца, иначе инвалидация по префиксу не сработает', () => {
    const key = queryKeys.readingProgress('v1', 'user-a');

    expect(key.slice(0, 2)).toEqual(['readingProgress', 'v1']);
  });

  it('без владельца ключ всё равно отличается от ключа вошедшего', () => {
    expect(queryKeys.readingProgress('v1')).toEqual(['readingProgress', 'v1', undefined]);
    expect(queryKeys.readingProgress('v1')).not.toEqual(queryKeys.readingProgress('v1', 'user-a'));
  });
});
