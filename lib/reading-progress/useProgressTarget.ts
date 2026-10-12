'use client';

import { useSession } from 'next-auth/react';
import type { ProgressTarget } from './types';

export interface ProgressIdentity {
  target: ProgressTarget;
  /**
   * Кто сейчас читает: `null` — аноним либо сессия ещё неизвестна.
   *
   * Заполнен и у вошедшего с протухшим токеном: он пишет локально, и его записи
   * должны быть подписаны им, а не выглядеть анонимными.
   */
  userId: string | null;
}

/**
 * Куда писать прогресс прямо сейчас и от чьего имени — единственный источник
 * правды на читалку, плеер и слияние при входе.
 *
 * Три состояния, а не два, и это главное:
 *
 * - `'unknown'` — `status === 'loading'`, про пользователя ещё ничего не
 *   известно. 🔴 Писать в этот момент нельзя **никуда**. Сочти его анонимом —
 *   и вошедший в первые миллисекунды положит открытую главу в локальное
 *   хранилище; слияние потом увидит её как самую свежую запись и откатит
 *   человека назад по книге. Ошибка бесшумная: жалоб не будет, будет
 *   «почему-то опять первая глава».
 * - `'server'` — сессия пригодна: есть пользователь и токен не сломан.
 * - `'local'` — писать в `localStorage`. Это и аноним, и вошедший с
 *   протухшим токеном (`session.error`): при неудачном обновлении токена
 *   в куке остаётся прежний, протухший `accessToken` (`lib/auth/config.ts`),
 *   запрос через прокси получил бы 401, и `withAuthRetry` отдал бы его
 *   вызывающему без повтора (временный отказ продления, `LEGACY-465`) —
 *   запись прогресса пропала бы. До захода 2 `LEGACY-465` тот же 401 вёл
 *   к `signOut` посреди книги. Триггеры
 *   бытовые: ротация refresh-токена во второй вкладке, выход на другом
 *   устройстве, отказ сети на `/auth/refresh`. Прогресс такого читателя копится
 *   локально и уезжает на сервер, как только сессия починится.
 *
 * 🔴 Признак один на читалку, плеер и слияние намеренно: три условия в трёх
 * файлах означают, что следующая правка починит одно и пропустит два.
 */
export const useProgressIdentity = (): ProgressIdentity => {
  const { data: session, status } = useSession();

  const userId = session?.user ? ((session.user as { id?: string }).id ?? null) : null;

  if (status === 'loading') return { target: 'unknown', userId: null };
  if (status === 'authenticated' && !session?.error) return { target: 'server', userId };

  return { target: 'local', userId };
};

export const useProgressTarget = (): ProgressTarget => useProgressIdentity().target;
