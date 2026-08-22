'use client';

/**
 * Прогресс чтения без аккаунта — в `localStorage`.
 *
 * Чтение и прослушивание открыты без входа (решение владельца от 22.08.2026), а
 * `PUT /me/progress/:versionId` требует токена. Без локального хранилища читатель
 * терял место в книге при закрытии вкладки, и бесплатное чтение оставалось
 * неудобным.
 *
 * 🔴 Каждое обращение к `localStorage` обёрнуто в `try/catch`, и не «на всякий
 * случай». В приватном окне Safari и при запрете хранилища сайту бросает **сам
 * геттер `window.localStorage`**, до любого `getItem`, а `setItem` вдобавок
 * бросает `QuotaExceededError` на забитом хранилище. Непойманное исключение
 * здесь — это белый экран посреди книги вместо потерянной закладки.
 *
 * 🔴 Все записи лежат под одним ключом, а не по ключу на книгу. Вытеснение идёт
 * по времени последнего чтения, и при ключе на книгу его пришлось бы делать
 * обходом всего `localStorage` на каждой записи — включая чужие ключи.
 *
 * 🔴 Каждая запись — это read-modify-write целой карты. Две вкладки пишут в один
 * ключ, и вкладка, закэшировавшая карту в памяти при монтировании, вернула бы её
 * обратно и стёрла бы прогресс соседней книги.
 */

import { logError } from '@/lib/utils/log-error';
import type { LocalProgressRecord, LocalProgressSide, ProgressSideKind } from './types';

/** Версия в имени: смена формата записи не требует миграции, старый ключ просто осиротеет. */
const STORAGE_KEY = 'bibliaris.reading-progress.v1';

/**
 * Сколько книг держим. Ограничение не про место (записи крошечные), а про
 * слияние: при входе оно делает по паре запросов на сторону каждой записи, и без
 * потолка логин у активного читателя превратился бы в лавину.
 */
export const MAX_LOCAL_PROGRESS_RECORDS = 10;

const getStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch (error) {
    // Геттер бросает сам — приватное окно, запрет хранилища для сайта.
    logError('[reading-progress] localStorage unavailable', error);
    return null;
  }
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const parseSide = (value: unknown): LocalProgressSide | null => {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (raw.ownerId !== null && typeof raw.ownerId !== 'string') return null;
  if (!isFiniteNumber(raw.chapterNumber) || raw.chapterNumber < 1) return null;
  if (!isFiniteNumber(raw.position) || raw.position < 0) return null;
  if (!isFiniteNumber(raw.updatedAt) || raw.updatedAt <= 0) return null;

  return {
    ownerId: raw.ownerId,
    chapterNumber: raw.chapterNumber,
    position: raw.position,
    updatedAt: raw.updatedAt,
  };
};

/**
 * Разбор одной записи. Чужой или устаревший мусор под нашим ключом — не повод
 * падать: непрошедшая запись просто выбрасывается.
 */
const parseRecord = (value: unknown): LocalProgressRecord | null => {
  if (typeof value !== 'object' || value === null) return null;
  const raw = value as Record<string, unknown>;

  if (typeof raw.versionId !== 'string' || raw.versionId.length === 0) return null;

  const text = parseSide(raw.text);
  const audio = parseSide(raw.audio);
  if (text === null && audio === null) return null;

  return { versionId: raw.versionId, text, audio };
};

/** Время последнего касания книги — по нему идёт вытеснение. */
export const lastTouchedAt = (record: LocalProgressRecord): number =>
  Math.max(record.text?.updatedAt ?? 0, record.audio?.updatedAt ?? 0);

/**
 * Доступна ли сторона этому читателю.
 *
 * 🔴 Условие одно на слияние и на восстановление. Два условия в двух файлах —
 * и одно из них рано или поздно забудут: именно так восстановление начало
 * поднимать чужую главу, пока слияние её честно пропускало.
 */
const isOwnedBy = (side: LocalProgressSide | null, ownerId: string | null): boolean =>
  side !== null && (side.ownerId === null || side.ownerId === ownerId);

const pickOwnedSides = (
  record: LocalProgressRecord,
  ownerId: string | null
): LocalProgressRecord | null => {
  const text = isOwnedBy(record.text, ownerId) ? record.text : null;
  const audio = isOwnedBy(record.audio, ownerId) ? record.audio : null;

  if (text === null && audio === null) return null;
  return { versionId: record.versionId, text, audio };
};

/** Все записи, свежие первыми. Битые молча отброшены. */
export const readAllLocalProgress = (): LocalProgressRecord[] => {
  const storage = getStorage();
  if (!storage) return [];

  try {
    const rawValue = storage.getItem(STORAGE_KEY);
    if (!rawValue) return [];

    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(parseRecord)
      .filter((record): record is LocalProgressRecord => record !== null)
      .sort((a, b) => lastTouchedAt(b) - lastTouchedAt(a));
  } catch (error) {
    logError('[reading-progress] failed to read local progress', error);
    return [];
  }
};

/**
 * Запись по книге — только те стороны, что вправе читать этот читатель.
 *
 * Читателю без аккаунта (`ownerId === null`) доступны только ничьи стороны;
 * вошедшему — ничьи и его собственные, накопленные, пока токен был сломан.
 */
export const readLocalProgress = (
  versionId: string,
  ownerId: string | null = null
): LocalProgressRecord | null => {
  if (!versionId) return null;

  const record = readAllLocalProgress().find((item) => item.versionId === versionId);
  if (!record) return null;

  return pickOwnedSides(record, ownerId);
};

const writeAll = (records: LocalProgressRecord[]): void => {
  const storage = getStorage();
  if (!storage) return;

  try {
    const trimmed = records
      .slice()
      .sort((a, b) => lastTouchedAt(b) - lastTouchedAt(a))
      .slice(0, MAX_LOCAL_PROGRESS_RECORDS);
    storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    // QuotaExceededError и запрет записи. Прогресс потерян, читалка — нет.
    logError('[reading-progress] failed to write local progress', error);
  }
};

interface SaveLocalProgressInput {
  versionId: string;
  /** `null` — читатель без аккаунта; иначе владелец этой стороны. */
  ownerId: string | null;
  kind: ProgressSideKind;
  chapterNumber: number;
  /** Доля 0..1 для текста, секунды для аудио. */
  position: number;
}

/**
 * Записать место в книге по одной из сторон.
 *
 * 🔴 Вторая сторона остаётся нетронутой целиком, включая её владельца и время
 * записи. Читалка всегда шлёт `position: 0` (позиции внутри главы она не
 * отслеживает), и общее поле позиции означало бы, что открытая после
 * прослушивания книга обнуляет двадцать пять минут аудио.
 */
export const saveLocalProgress = (input: SaveLocalProgressInput): void => {
  const { versionId, ownerId, kind, chapterNumber, position } = input;
  if (!versionId) return;

  const records = readAllLocalProgress();
  const previous = records.find((record) => record.versionId === versionId) ?? null;

  const side: LocalProgressSide = { ownerId, chapterNumber, position, updatedAt: Date.now() };

  const next: LocalProgressRecord = {
    versionId,
    text: kind === 'text' ? side : (previous?.text ?? null),
    audio: kind === 'audio' ? side : (previous?.audio ?? null),
  };

  writeAll([next, ...records.filter((record) => record.versionId !== versionId)]);
};

/**
 * Убрать названные стороны книги. Запись без сторон исчезает целиком.
 *
 * 🔴 Слияние стирает только то, что само обработало. Стереть запись целиком —
 * значит заодно выбросить сторону чужого владельца, которую слияние сознательно
 * не трогало: её хозяин ещё вернётся за своим местом в книге.
 */
export const dropLocalProgressSides = (
  versionId: string,
  kinds: readonly ProgressSideKind[]
): void => {
  if (!versionId || kinds.length === 0) return;

  const records = readAllLocalProgress();
  const record = records.find((item) => item.versionId === versionId);
  if (!record) return;

  const next: LocalProgressRecord = {
    versionId,
    text: kinds.includes('text') ? null : record.text,
    audio: kinds.includes('audio') ? null : record.audio,
  };

  const rest = records.filter((item) => item.versionId !== versionId);
  writeAll(next.text === null && next.audio === null ? rest : [next, ...rest]);
};

export const removeLocalProgress = (versionId: string): void =>
  dropLocalProgressSides(versionId, ['text', 'audio']);

/**
 * Записи, которые вправе уехать в аккаунт этого пользователя: свои и ничьи.
 * Чужие стороны из выдачи вырезаны, а не только пропущены при отправке.
 *
 * 🔴 На общем компьютере читатель с протухшей сессией копит прогресс локально;
 * забрать его в аккаунт следующего вошедшего — значит показать тому чужие книги
 * на полке и затереть его собственные позиции.
 */
export const readMergeableLocalProgress = (userId: string): LocalProgressRecord[] =>
  readAllLocalProgress()
    .map((record) => pickOwnedSides(record, userId))
    .filter((record): record is LocalProgressRecord => record !== null);

/** Только для тестов и отладки: полностью очистить хранилище прогресса. */
export const clearLocalProgress = (): void => {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch (error) {
    logError('[reading-progress] failed to clear local progress', error);
  }
};
