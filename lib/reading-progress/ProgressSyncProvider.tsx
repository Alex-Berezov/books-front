'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logError } from '@/lib/utils/log-error';
import { mergeLocalProgressIntoAccount } from './mergeLocalProgress';
import { useProgressIdentity } from './useProgressTarget';

interface ProgressSyncValue {
  /**
   * Можно ли уже восстанавливать позицию в книге.
   *
   * 🔴 Читалка и плеер обязаны дождаться этого признака. Восстановишься раньше
   * слияния — покажешь серверную 5-ю главу, хотя локально лежит 12-я, а через
   * секунду отложенное сохранение отправит эту самую 5-ю на сервер и затрёт
   * 12-ю уже по-настоящему. Дефект самовоспроизводящийся: он не только
   * показывает не то место, он его и записывает.
   */
  isSettled: boolean;
}

/**
 * Без провайдера считаем, что сливать нечего. Это осознанно мягкий дефолт:
 * зависшая на «ещё нельзя» читалка не восстановила бы позицию вообще никогда,
 * а так работа продолжается — теряется только слияние.
 */
const ProgressSyncContext = createContext<ProgressSyncValue>({ isSettled: true });

export const useProgressSync = (): ProgressSyncValue => useContext(ProgressSyncContext);

/**
 * Предельный срок слияния.
 *
 * 🔴 В `lib/http.ts` нет ни таймаута, ни `AbortSignal`: зависший запрос
 * (мобильная сеть, повисший прокси) не отвалится сам. Без дедлайна `isSettled`
 * остался бы `false` навсегда, а вместе с ним закрыты и восстановление, и
 * сохранение — за весь визит не записалось бы ни одной главы, и на экране это
 * никак не видно. Уцелевшие записи сольются при следующем заходе.
 */
const MERGE_DEADLINE_MS = 10_000;

const afterDeadline = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, MERGE_DEADLINE_MS);
  });

/**
 * Сводит локальный прогресс с серверным один раз за вход в аккаунт.
 *
 * 🔴 Момент слияния — переход `useProgressIdentity()` в `'server'`, а не
 * обработчик формы входа. Единой точки «после логина» в коде нет: вход по паролю
 * идёт через `router.push` + `router.refresh`, а после возврата от Google
 * клиентский код формы не исполняется вовсе. Признак сессии накрывает разом все
 * три живых входа — пароль, возврат OAuth и восстановление по cookie, — а заодно
 * и починку протухшего токена, после которой у читателя тоже могут остаться
 * локальные записи.
 *
 * 🔴 Отдельной отметки «уже слито» нет намеренно. Она бы протухала: читать без
 * входа можно и после выхода из аккаунта. Защита от повтора встроена в само
 * слияние — успешно перенесённые стороны удаляются, и повторный проход по пустому
 * хранилищу не делает ни одного запроса. Уцелевшая после отказа запись, наоборот,
 * должна быть подхвачена при следующем заходе, и отметка этому мешала бы.
 */
export const ProgressSyncProvider = ({ children }: { children: ReactNode }) => {
  const { target, userId } = useProgressIdentity();
  const queryClient = useQueryClient();
  const [mergedForUserId, setMergedForUserId] = useState<string | null>(null);
  const isMergingRef = useRef(false);

  const hasMerged = userId !== null && mergedForUserId === userId;

  /**
   * Сброс отметки при выходе из аккаунта: между сессиями можно читать без входа,
   * и следующий вход обязан слить накопленное заново.
   *
   * 🔴 Сбрасываем только когда слияние не идёт. Иначе мигание сессии — а его даёт
   * неудачное обновление токена, после которого `target` уходит в `'local'` и
   * возвращается, — запускало бы второй проход поверх первого. Оба зовут
   * `dropLocalProgressSides`, то есть read-modify-write всей карты: один проход
   * воскрешал бы записи, только что стёртые другим, и слал те же `PUT` дважды.
   */
  useEffect(() => {
    if (target === 'server' && userId !== null) return;
    if (isMergingRef.current) return;

    setMergedForUserId(null);
  }, [target, userId]);

  useEffect(() => {
    if (target !== 'server' || userId === null) return;
    if (hasMerged || isMergingRef.current) return;

    isMergingRef.current = true;

    const run = async () => {
      try {
        // 🔴 Гонка с дедлайном, а не просто ожидание: см. `MERGE_DEADLINE_MS`.
        const outcome = await Promise.race([
          mergeLocalProgressIntoAccount(userId),
          afterDeadline(),
        ]);

        if (typeof outcome === 'number' && outcome > 0) {
          // 🔴 Ждём именно `await`: читалка берёт позицию из `readerBootstrap`, и
          // без дождавшейся инвалидации она восстановится по ответу, полученному
          // до слияния, — то есть по значению, которое слияние только что заменило.
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['readerBootstrap'] }),
            queryClient.invalidateQueries({ queryKey: ['readingProgress'] }),
            queryClient.invalidateQueries({ queryKey: ['bookshelf'] }),
          ]);
        }
      } catch (error) {
        logError('[reading-progress] merge on sign-in failed', error);
      } finally {
        isMergingRef.current = false;
        /**
         * 🔴 Без проверки «жив ли эффект» намеренно. При `reactStrictMode` React
         * прогоняет setup → cleanup → setup, и второй заход упирается в
         * `isMergingRef`; если бы результат первого отбрасывался по признаку
         * размонтирования, `mergedForUserId` не выставился бы уже никогда —
         * зависимости эффекта при этом не меняются, третьего захода не будет.
         * `isSettled` остался бы `false` на весь визит.
         *
         * Даже на отказе снимаем блокировку: иначе книга осталась бы навсегда на
         * первой главе из-за одной неудачной сети.
         */
        setMergedForUserId(userId);
      }
    };

    void run();
  }, [target, userId, hasMerged, queryClient]);

  /**
   * 🔴 `target === 'server'` без `userId` тоже считается улаженным. Иначе сессия,
   * пришедшая без `user.id`, навсегда заперла бы и восстановление, и сохранение:
   * сливать в такую сессию всё равно нечего и некуда.
   */
  const isSettled = target === 'local' || (target === 'server' && (userId === null || hasMerged));

  return (
    <ProgressSyncContext.Provider value={{ isSettled }}>{children}</ProgressSyncContext.Provider>
  );
};
