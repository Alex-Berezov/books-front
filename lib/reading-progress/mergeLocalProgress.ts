'use client';

import { getProgress, updateTextProgress } from '@/api/endpoints/progress';
import { logError } from '@/lib/utils/log-error';
import { ApiError } from '@/types/api';
import type { LocalProgressRecord, LocalProgressSide, ProgressSideKind } from './types';
import type { UpdateProgressRequest } from '@/types/api-schema';
import { dropLocalProgressSides, readMergeableLocalProgress } from './localProgress';

/**
 * Отказ, после которого повторять бессмысленно.
 *
 * 🔴 400 — приговор всегда: `upsert` отвечает им, когда `position` вышла за
 * длину дорожки или за диапазон 0..1. 404 — приговор **только с опознанным
 * телом** (`Chapter not found`, `AudioChapter not found`, `BookVersion not
 * found`): тот же код отдаёт шлюз при выкате и при сбитом
 * `NEXT_PUBLIC_API_BASE_URL`, и без разбора тела одна неверная настройка
 * вычистила бы всё накопленное без аккаунта хранилище разом.
 *
 * Оставлять непереносимую запись тоже нельзя: она держит слот из десяти и
 * добавляет запрос к каждому входу в аккаунт, вытесняя из лимита живые книги.
 */
const NOT_FOUND_BODIES = ['chapter not found', 'audiochapter not found', 'bookversion not found'];

const isPermanentRejection = (error: unknown): boolean => {
  if (!(error instanceof ApiError)) return false;
  if (error.statusCode === 400) return true;
  if (error.statusCode !== 404) return false;

  const message = (error.message || '').toLowerCase();
  return NOT_FOUND_BODIES.some((known) => message.includes(known));
};

interface PendingSide {
  kind: ProgressSideKind;
  side: LocalProgressSide;
}

const toUpdateRequest = ({ kind, side }: PendingSide): UpdateProgressRequest =>
  kind === 'text'
    ? { chapterNumber: side.chapterNumber, position: side.position }
    : { audioChapterNumber: side.chapterNumber, position: side.position };

/**
 * Стороны книги, которые локально свежее серверной записи.
 *
 * Сервер хранит текст и аудио в одной строке с одной отметкой времени, поэтому
 * обе локальные стороны сравниваются с ней же. Возвращаются от старой к свежей:
 * `position` на сервере одно поле на обе стороны, и последним должен уехать тот
 * запрос, чья позиция и должна остаться.
 */
const collectFresherSides = (
  record: LocalProgressRecord,
  serverUpdatedAt: number | null
): PendingSide[] => {
  const sides: PendingSide[] = [];

  if (record.text && (serverUpdatedAt === null || record.text.updatedAt > serverUpdatedAt)) {
    sides.push({ kind: 'text', side: record.text });
  }
  if (record.audio && (serverUpdatedAt === null || record.audio.updatedAt > serverUpdatedAt)) {
    sides.push({ kind: 'audio', side: record.audio });
  }

  return sides.sort((a, b) => a.side.updatedAt - b.side.updatedAt);
};

const presentKinds = (record: LocalProgressRecord): ProgressSideKind[] => {
  const kinds: ProgressSideKind[] = [];
  if (record.text) kinds.push('text');
  if (record.audio) kinds.push('audio');
  return kinds;
};

/**
 * Перенести прогресс, накопленный без аккаунта, в аккаунт.
 *
 * Правило разрешения конфликта задано постановкой: побеждает более поздняя по
 * времени записи сторона. Читатель дочитал до 12-й главы без входа, вошёл в
 * аккаунт с 5-й — останется 12-я.
 *
 * 🔴 Отказ `GET` не равен «прогресса на сервере нет». Отсутствие прогресса — это
 * 200 с пустым телом, то есть `null`; исключение здесь означает 5xx, таймаут или
 * обрыв. Принять отказ за пустоту — значит отправить старую локальную позицию
 * поверх свежей серверной и тут же удалить локальную копию: восстановить будет
 * неоткуда. Поэтому на отказе книга пропускается целиком, до следующего захода.
 *
 * 🔴 Стираются только те стороны, что удалось разрешить, и только свои: чужая
 * сторона в этой же записи принадлежит другому читателю того же браузера и в
 * выдачу `readMergeableLocalProgress` не попадает вовсе.
 *
 * 🔴 Отказ по одной книге не останавливает остальные: цикл ловит на каждой
 * итерации. Иначе первая недоступная книга оставляла бы весь остальной прогресс
 * несведённым навсегда.
 *
 * @param userId владелец аккаунта, в который сливаем
 * @returns сколько запросов ушло на сервер
 */
export const mergeLocalProgressIntoAccount = async (userId: string): Promise<number> => {
  const records = readMergeableLocalProgress(userId);
  let sent = 0;

  for (const record of records) {
    let serverUpdatedAt: number | null = null;

    try {
      const serverProgress = await getProgress(record.versionId);
      if (serverProgress) {
        const parsed = Date.parse(serverProgress.updatedAt);
        serverUpdatedAt = Number.isFinite(parsed) ? parsed : null;
      }
    } catch (error) {
      logError(`[reading-progress] cannot read server progress for ${record.versionId}`, error);
      continue;
    }

    // Сторона, проигравшая серверу по времени, разрешена и без запроса: её место
    // уже занято более свежим, держать её дальше незачем.
    const resolved = new Set<ProgressSideKind>(presentKinds(record));

    for (const pending of collectFresherSides(record, serverUpdatedAt)) {
      try {
        await updateTextProgress(record.versionId, toUpdateRequest(pending));
        sent += 1;
      } catch (error) {
        if (!isPermanentRejection(error)) resolved.delete(pending.kind);
        logError(
          `[reading-progress] failed to merge ${pending.kind} progress for ${record.versionId}`,
          error
        );
      }
    }

    dropLocalProgressSides(record.versionId, [...resolved]);
  }

  return sent;
};
