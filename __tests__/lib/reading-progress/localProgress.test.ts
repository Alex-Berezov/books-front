import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MAX_LOCAL_PROGRESS_RECORDS,
  clearLocalProgress,
  dropLocalProgressSides,
  readAllLocalProgress,
  readLocalProgress,
  readMergeableLocalProgress,
  removeLocalProgress,
  saveLocalProgress,
} from '@/lib/reading-progress';

/**
 * Хранилище прогресса без аккаунта.
 *
 * 🔴 Посадка на недоступное хранилище — не формальность. В приватном окне Safari
 * и при запрете хранилища сайту бросает сам геттер `window.localStorage`, до
 * любого `getItem`, а `setItem` вдобавок бросает `QuotaExceededError`. Уберут
 * `try/catch` — читатель получит белый экран посреди книги вместо потерянной
 * закладки, и воспроизведётся это только у тех, кто читает инкогнито.
 */

const STORAGE_KEY = 'bibliaris.reading-progress.v1';

const realStorage = window.localStorage;

const restoreStorage = () => {
  Object.defineProperty(window, 'localStorage', {
    value: realStorage,
    configurable: true,
    writable: true,
  });
};

const saveText = (versionId: string, chapterNumber: number, ownerId: string | null = null) =>
  saveLocalProgress({ versionId, ownerId, kind: 'text', chapterNumber, position: 0 });

const saveAudio = (
  versionId: string,
  chapterNumber: number,
  position: number,
  ownerId: string | null = null
) => saveLocalProgress({ versionId, ownerId, kind: 'audio', chapterNumber, position });

describe('localProgress', () => {
  beforeEach(() => {
    restoreStorage();
    clearLocalProgress();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    restoreStorage();
    clearLocalProgress();
    vi.useRealTimers();
  });

  it('сохраняет и читает место в книге по версии', () => {
    saveText('v1', 12);

    expect(readLocalProgress('v1')).toMatchObject({
      versionId: 'v1',
      text: { ownerId: null, chapterNumber: 12, position: 0 },
      audio: null,
    });
    expect(readLocalProgress('v2')).toBeNull();
  });

  /**
   * 🔴 Стороны книги разнесены потому, что сервер принимает ровно одно из полей
   * `chapterNumber` / `audioChapterNumber` (`@Xor`) и трактует `position`
   * по-разному: доля 0..1 для текста, секунды для аудио. Слей их обратно — и
   * слияние начнёт слать 400 по каждой книге, которую и читали, и слушали.
   */
  it('прослушивание не стирает главу чтения и наоборот', () => {
    saveText('v1', 12);
    saveAudio('v1', 3, 145);

    expect(readLocalProgress('v1')).toMatchObject({
      text: { chapterNumber: 12, position: 0 },
      audio: { chapterNumber: 3, position: 145 },
    });
  });

  /**
   * 🔴 Самый дорогой из побочных эффектов общего поля позиции: читалка всегда
   * шлёт ноль, и книга, открытая в тексте после прослушивания, обнуляла бы
   * двадцать пять минут аудио — молча, без единой ошибки.
   */
  it('открытая читалка не обнуляет позицию прослушивания', () => {
    saveAudio('v1', 3, 1500);
    saveText('v1', 7);

    expect(readLocalProgress('v1')?.audio).toMatchObject({ chapterNumber: 3, position: 1500 });
  });

  it('у каждой стороны своё время записи', () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date('2026-08-22T10:00:00.000Z'));
    saveAudio('v1', 3, 1500);
    vi.setSystemTime(new Date('2026-08-22T12:00:00.000Z'));
    saveText('v1', 7);

    const record = readLocalProgress('v1');

    expect(record?.audio?.updatedAt).toBe(Date.parse('2026-08-22T10:00:00.000Z'));
    expect(record?.text?.updatedAt).toBe(Date.parse('2026-08-22T12:00:00.000Z'));
  });

  it('вытесняет самую старую книгу при переполнении', () => {
    vi.useFakeTimers();

    for (let i = 0; i < MAX_LOCAL_PROGRESS_RECORDS + 2; i += 1) {
      vi.setSystemTime(new Date(2026, 7, 22, 12, 0, i));
      saveText(`v${i}`, 1);
    }

    expect(readAllLocalProgress()).toHaveLength(MAX_LOCAL_PROGRESS_RECORDS);
    expect(readLocalProgress('v0')).toBeNull();
    expect(readLocalProgress('v1')).toBeNull();
    expect(readLocalProgress(`v${MAX_LOCAL_PROGRESS_RECORDS + 1}`)).not.toBeNull();
  });

  it('перечитанная книга не вытесняется как старая', () => {
    vi.useFakeTimers();

    vi.setSystemTime(new Date(2026, 7, 22, 12, 0, 0));
    saveText('old', 1);

    for (let i = 1; i <= MAX_LOCAL_PROGRESS_RECORDS; i += 1) {
      vi.setSystemTime(new Date(2026, 7, 22, 12, 0, i));
      saveText(`v${i}`, 1);
    }

    vi.setSystemTime(new Date(2026, 7, 22, 13, 0, 0));
    saveText('old', 2);

    expect(readLocalProgress('old')?.text).toMatchObject({ chapterNumber: 2 });
    expect(readAllLocalProgress()).toHaveLength(MAX_LOCAL_PROGRESS_RECORDS);
  });

  it('удаляет запись по версии, не трогая соседние', () => {
    saveText('v1', 1);
    saveText('v2', 2);

    removeLocalProgress('v1');

    expect(readLocalProgress('v1')).toBeNull();
    expect(readLocalProgress('v2')?.text).toMatchObject({ chapterNumber: 2 });
  });

  /**
   * 🔴 Вторая вкладка не должна возвращать карту, какой она была на её
   * монтировании. Кэш карты в памяти означает потерянный прогресс соседней книги
   * — и только у тех, кто держит две вкладки, то есть у самых активных.
   */
  it('запись из второй вкладки не стирает книгу, открытую в первой', () => {
    saveText('book-a', 4);
    saveAudio('book-b', 2, 30);

    expect(readLocalProgress('book-a')?.text).toMatchObject({ chapterNumber: 4 });
    expect(readLocalProgress('book-b')?.audio).toMatchObject({ chapterNumber: 2, position: 30 });
  });

  /**
   * Краевой случай из постановки: одна и та же книга открыта дважды.
   * Синхронизации в живом времени нет — побеждает последняя запись, и это
   * зафиксировано в `LEGACY-269`. Здесь важно другое: карта переживает такую
   * гонку целиком, а не рвётся.
   */
  it('одна книга в двух вкладках: побеждает последняя запись, соседние целы', () => {
    saveText('other', 9);

    // Вкладка A ушла на 12-ю главу.
    saveText('same-book', 12);
    // Вкладка B, открытая раньше, дописывает свою 4-ю.
    saveText('same-book', 4);

    expect(readLocalProgress('same-book')?.text).toMatchObject({ chapterNumber: 4 });
    expect(readLocalProgress('other')?.text).toMatchObject({ chapterNumber: 9 });
    expect(readAllLocalProgress()).toHaveLength(2);
  });

  /**
   * 🔴 Общий компьютер. Локально пишет не только аноним, но и вошедший с
   * протухшим токеном; без владельца слияние залило бы его позиции в аккаунт
   * следующего, кто войдёт с этого браузера.
   */
  it('к слиянию допускаются только свои и ничьи записи', () => {
    saveText('anon-book', 1, null);
    saveText('mine', 2, 'user-1');
    saveText('foreign', 3, 'user-2');

    const mergeable = readMergeableLocalProgress('user-1').map((record) => record.versionId);

    expect(mergeable).toContain('anon-book');
    expect(mergeable).toContain('mine');
    expect(mergeable).not.toContain('foreign');
  });

  /**
   * 🔴 Владелец живёт на стороне, а не на записи. Сделай его общим — и книга,
   * которую A слушал со сломанным токеном, а потом читал аноним, становится
   * «ничьей» вместе с аудиопозицией A — и первое же слияние отправляет её в чужой
   * аккаунт, обходя ту самую защиту, ради которой поле заведено.
   */
  it('запись анонима не делает ничьей чужую вторую сторону', () => {
    saveAudio('shared', 3, 1500, 'user-a');
    saveText('shared', 7, null);

    const forAnon = readLocalProgress('shared', null);
    expect(forAnon?.text).toMatchObject({ chapterNumber: 7 });
    expect(forAnon?.audio).toBeNull();

    const forStranger = readMergeableLocalProgress('user-b');
    expect(forStranger[0]?.audio).toBeNull();
    expect(forStranger[0]?.text).toMatchObject({ chapterNumber: 7 });
  });

  /**
   * 🔴 Восстановление читает тем же правилом, что и слияние. Иначе на общем
   * компьютере B попадает на главу A и через три секунды записывает её в свой аккаунт.
   */
  it('чужая сторона не видна ни другому вошедшему, ни анониму', () => {
    saveText('v1', 12, 'user-a');

    expect(readLocalProgress('v1', 'user-a')?.text).toMatchObject({ chapterNumber: 12 });
    expect(readLocalProgress('v1', 'user-b')).toBeNull();
    expect(readLocalProgress('v1', null)).toBeNull();
  });

  /**
   * 🔴 Слияние стирает только то, что само обработало. Стереть запись целиком —
   * значит выбросить сторону чужого владельца, которую оно сознательно не трогало.
   */
  it('стирание одной стороны не трогает вторую', () => {
    saveText('v1', 12, null);
    saveAudio('v1', 3, 145, 'user-a');

    dropLocalProgressSides('v1', ['text']);

    const record = readLocalProgress('v1', 'user-a');
    expect(record?.text).toBeNull();
    expect(record?.audio).toMatchObject({ chapterNumber: 3, position: 145 });
  });

  it('стирание последней стороны убирает запись целиком', () => {
    saveText('v1', 12, null);

    dropLocalProgressSides('v1', ['text']);

    expect(readLocalProgress('v1')).toBeNull();
    expect(readAllLocalProgress()).toHaveLength(0);
  });

  it('битое содержимое хранилища не роняет чтение', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json at all');

    expect(readAllLocalProgress()).toEqual([]);
    expect(readLocalProgress('v1')).toBeNull();
  });

  it('записи неверной формы отбрасываются поштучно', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          versionId: 'good',
          text: { ownerId: null, chapterNumber: 3, position: 0, updatedAt: 2 },
          audio: null,
        },
        { versionId: '', text: { ownerId: null, chapterNumber: 1, position: 0, updatedAt: 1 } },
        { versionId: 'no-sides', text: null, audio: null },
        { versionId: 'no-time', text: { ownerId: null, chapterNumber: 1, position: 0 } },
        {
          versionId: 'bad-owner',
          text: { ownerId: 7, chapterNumber: 1, position: 0, updatedAt: 1 },
        },
        'мусор',
      ])
    );

    const records = readAllLocalProgress();

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ versionId: 'good', text: { chapterNumber: 3 } });
  });

  it('недоступное хранилище не бросает наружу ни на чтении, ни на записи', () => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });

    expect(() => saveText('v1', 1)).not.toThrow();
    expect(() => removeLocalProgress('v1')).not.toThrow();
    expect(() => clearLocalProgress()).not.toThrow();
    expect(readAllLocalProgress()).toEqual([]);
    expect(readLocalProgress('v1')).toBeNull();
  });

  it('переполненная квота не роняет запись', () => {
    // Восстановление — в `afterEach` через `vi.restoreAllMocks`: упади ассерт
    // ниже, подмена `setItem` утекла бы в соседние тесты этого же файла.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });

    expect(() => saveText('v1', 1)).not.toThrow();
  });
});
