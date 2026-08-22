import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getProgress, updateTextProgress } from '@/api/endpoints/progress';
import {
  clearLocalProgress,
  mergeLocalProgressIntoAccount,
  readAllLocalProgress,
  readLocalProgress,
  saveLocalProgress,
} from '@/lib/reading-progress';
import { ApiError } from '@/types/api';
import type { ReadingProgress } from '@/types/api-schema';

/**
 * Слияние локального прогресса с аккаунтом.
 *
 * 🔴 Побеждает более поздняя по времени сторона — правило из постановки. Читатель
 * дочитал до 12-й главы без входа, вошёл в аккаунт с 5-й: остаться должна 12-я.
 * Разверни сравнение — и человек молча потеряет всё, что прочитал до регистрации,
 * ровно в тот момент, когда решил завести аккаунт.
 *
 * 🔴 Сравнение идёт по `updatedAt` — единственной отметке времени, которую сервер
 * действительно отдаёт. Раньше здесь стояло `lastReadAt`, которого нет ни в схеме
 * Prisma, ни в ответе: `Date.parse(undefined)` даёт `NaN`, и локальная сторона
 * побеждала **всегда**, включая случай, когда на сервере лежит куда более свежее
 * место с другого устройства.
 *
 * 🔴 Локальная запись удаляется только после ответа сервера. Удалишь заранее —
 * на отказе сети прогресс исчезнет с обеих сторон разом.
 */

vi.mock('@/api/endpoints/progress', () => ({
  getProgress: vi.fn(),
  updateTextProgress: vi.fn(),
}));

const getProgressMock = vi.mocked(getProgress);
const updateTextProgressMock = vi.mocked(updateTextProgress);

const USER = 'user-1';

const serverProgress = (updatedAt: string, overrides: Partial<ReadingProgress> = {}) =>
  ({
    id: 'p1',
    userId: USER,
    bookVersionId: 'v1',
    chapterNumber: 5,
    audioChapterNumber: null,
    position: 0,
    updatedAt,
    ...overrides,
  }) satisfies ReadingProgress;

describe('mergeLocalProgressIntoAccount', () => {
  beforeEach(() => {
    clearLocalProgress();
    getProgressMock.mockReset();
    updateTextProgressMock.mockReset();
    updateTextProgressMock.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearLocalProgress();
  });

  const writeText = (versionId: string, at: string, chapterNumber: number) => {
    vi.setSystemTime(new Date(at));
    saveLocalProgress({ versionId, ownerId: null, kind: 'text', chapterNumber, position: 0 });
  };

  const writeAudio = (versionId: string, at: string, chapterNumber: number, position: number) => {
    vi.setSystemTime(new Date(at));
    saveLocalProgress({ versionId, ownerId: null, kind: 'audio', chapterNumber, position });
  };

  it('локальная запись новее серверной — уезжает на сервер', async () => {
    writeText('v1', '2026-08-22T12:00:00.000Z', 12);
    getProgressMock.mockResolvedValue(serverProgress('2026-08-22T10:00:00.000Z'));

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(1);

    expect(updateTextProgressMock).toHaveBeenCalledWith('v1', { chapterNumber: 12, position: 0 });
    expect(readLocalProgress('v1')).toBeNull();
  });

  it('серверная запись новее локальной — локальная просто отбрасывается', async () => {
    writeText('v1', '2026-08-22T09:00:00.000Z', 12);
    getProgressMock.mockResolvedValue(serverProgress('2026-08-22T10:00:00.000Z'));

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(0);

    expect(updateTextProgressMock).not.toHaveBeenCalled();
    expect(readLocalProgress('v1')).toBeNull();
  });

  it('серверной записи нет вовсе — локальная становится первой', async () => {
    writeText('v1', '2026-08-22T12:00:00.000Z', 7);
    getProgressMock.mockResolvedValue(null);

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(1);

    expect(updateTextProgressMock).toHaveBeenCalledWith('v1', { chapterNumber: 7, position: 0 });
    expect(readLocalProgress('v1')).toBeNull();
  });

  it('пустое хранилище не делает ни одного запроса', async () => {
    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(0);

    expect(getProgressMock).not.toHaveBeenCalled();
    expect(updateTextProgressMock).not.toHaveBeenCalled();
  });

  /**
   * 🔴 Ручка принимает ровно одно из полей `chapterNumber` / `audioChapterNumber`
   * (`@Xor` в `UpdateReadingProgressDto`), и трактует `position` по-разному:
   * доля 0..1 для текста, секунды для аудио. Один запрос с обоими полями —
   * это 400, то есть книга, которую и читали, и слушали, не переносится никогда.
   */
  it('текст и аудио уезжают раздельными запросами, каждый со своей позицией', async () => {
    writeText('v1', '2026-08-22T11:00:00.000Z', 12);
    writeAudio('v1', '2026-08-22T12:00:00.000Z', 3, 145);
    getProgressMock.mockResolvedValue(null);

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(2);

    expect(updateTextProgressMock).toHaveBeenCalledTimes(2);
    expect(updateTextProgressMock).toHaveBeenNthCalledWith(1, 'v1', {
      chapterNumber: 12,
      position: 0,
    });
    expect(updateTextProgressMock).toHaveBeenNthCalledWith(2, 'v1', {
      audioChapterNumber: 3,
      position: 145,
    });
  });

  /**
   * `position` на сервере одно поле на обе стороны: последним должен уехать
   * запрос той стороны, чья позиция и должна остаться.
   */
  it('последним уезжает более свежая сторона', async () => {
    writeAudio('v1', '2026-08-22T11:00:00.000Z', 3, 145);
    writeText('v1', '2026-08-22T12:00:00.000Z', 12);
    getProgressMock.mockResolvedValue(null);

    await mergeLocalProgressIntoAccount(USER);

    expect(updateTextProgressMock).toHaveBeenNthCalledWith(2, 'v1', {
      chapterNumber: 12,
      position: 0,
    });
  });

  it('свежее сервера только одна сторона — уезжает только она', async () => {
    writeText('v1', '2026-08-22T09:00:00.000Z', 12);
    writeAudio('v1', '2026-08-22T13:00:00.000Z', 3, 145);
    getProgressMock.mockResolvedValue(serverProgress('2026-08-22T10:00:00.000Z'));

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(1);

    expect(updateTextProgressMock).toHaveBeenCalledTimes(1);
    expect(updateTextProgressMock).toHaveBeenCalledWith('v1', {
      audioChapterNumber: 3,
      position: 145,
    });
  });

  /**
   * 🔴 Отказ `GET` — это не «на сервере пусто». Принять 502 за пустоту значит
   * отправить старую локальную позицию поверх свежей серверной и тут же удалить
   * локальную копию: восстановить будет неоткуда.
   */
  it('отказ чтения серверного прогресса пропускает книгу и сохраняет локальную запись', async () => {
    writeText('v1', '2026-08-22T09:00:00.000Z', 3);
    getProgressMock.mockRejectedValue(new ApiError({ message: 'bad gateway', statusCode: 502 }));

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(0);

    expect(updateTextProgressMock).not.toHaveBeenCalled();
    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 3 });
  });

  it('отказ отправки сохраняет локальную запись до следующей попытки', async () => {
    writeText('v1', '2026-08-22T12:00:00.000Z', 12);
    getProgressMock.mockResolvedValue(null);
    updateTextProgressMock.mockRejectedValue(new Error('network'));

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(0);

    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 12 });
  });

  /**
   * 🔴 404 `Chapter not found` и 400 по диапазону позиции — приговор записи, а не
   * временный сбой. Оставить её значит держать мёртвый груз в одном из десяти
   * слотов и добавлять два запроса к каждому входу, вытесняя живые книги.
   */
  it('неустранимый отказ выбрасывает запись, а не копит её вечно', async () => {
    writeText('v1', '2026-08-22T12:00:00.000Z', 12);
    getProgressMock.mockResolvedValue(null);
    updateTextProgressMock.mockRejectedValue(
      new ApiError({ message: 'Chapter not found', statusCode: 404 })
    );

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(0);

    expect(readLocalProgress('v1')).toBeNull();
  });

  /**
   * 🔴 Одна недоступная книга не должна оставлять весь остальной прогресс
   * несведённым. Дефект такого рода не воспроизводится на демо-аккаунте с одной
   * книгой и вылезает только у читателя с полкой.
   */
  it('отказ по одной книге не останавливает остальные', async () => {
    writeText('bad', '2026-08-22T12:00:00.000Z', 3);
    writeText('good', '2026-08-22T12:30:00.000Z', 4);

    getProgressMock.mockResolvedValue(null);
    updateTextProgressMock.mockImplementation(async (versionId: string) => {
      if (versionId === 'bad') throw new Error('network');
    });

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(1);

    expect(readLocalProgress('good')).toBeNull();
    expect(readLocalProgress('bad')?.text).toMatchObject({ chapterNumber: 3 });
    expect(readAllLocalProgress()).toHaveLength(1);
  });

  /**
   * 🔴 Общий компьютер: записи чужого владельца не должны уехать в аккаунт того,
   * кто вошёл следующим.
   */
  it('чужие записи не сливаются и не удаляются', async () => {
    vi.setSystemTime(new Date('2026-08-22T12:00:00.000Z'));
    saveLocalProgress({
      versionId: 'foreign',
      ownerId: 'user-2',
      kind: 'text',
      chapterNumber: 8,
      position: 0,
    });
    getProgressMock.mockResolvedValue(null);

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(0);

    expect(getProgressMock).not.toHaveBeenCalled();
    expect(readLocalProgress('foreign', 'user-2')?.text).toMatchObject({ chapterNumber: 8 });
  });

  /**
   * 🔴 Слияние забирает свою сторону книги и оставляет чужую на месте: у неё есть
   * хозяин, и он ещё вернётся за своим местом.
   */
  it('чужая сторона той же книги переживает слияние', async () => {
    vi.setSystemTime(new Date('2026-08-22T11:00:00.000Z'));
    saveLocalProgress({
      versionId: 'v1',
      ownerId: 'user-2',
      kind: 'audio',
      chapterNumber: 3,
      position: 145,
    });
    writeText('v1', '2026-08-22T12:00:00.000Z', 12);
    getProgressMock.mockResolvedValue(null);

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(1);

    expect(updateTextProgressMock).toHaveBeenCalledTimes(1);
    expect(updateTextProgressMock).toHaveBeenCalledWith('v1', { chapterNumber: 12, position: 0 });
    expect(readLocalProgress('v1', 'user-2')?.audio).toMatchObject({ chapterNumber: 3 });
    // Своей стороны у вошедшего больше нет, а чужая ему не видна — записи для него нет.
    expect(readLocalProgress('v1', USER)).toBeNull();
  });

  /**
   * 🔴 404 отдаёт не только «Chapter not found»: тот же код приходит от шлюза
   * при выкате и при сбитом `NEXT_PUBLIC_API_BASE_URL`. Без разбора тела одна
   * неверная настройка вычистила бы всё хранилище разом.
   */
  it('404 без опознанного тела считается временным отказом', async () => {
    writeText('v1', '2026-08-22T12:00:00.000Z', 12);
    getProgressMock.mockResolvedValue(null);
    updateTextProgressMock.mockRejectedValue(
      new ApiError({ message: 'Cannot PUT /me/progress/v1', statusCode: 404 })
    );

    await expect(mergeLocalProgressIntoAccount(USER)).resolves.toBe(0);

    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 12 });
  });
});
