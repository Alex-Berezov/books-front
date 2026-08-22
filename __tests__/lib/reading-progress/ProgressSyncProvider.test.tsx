import { StrictMode } from 'react';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getProgress, updateTextProgress } from '@/api/endpoints/progress';
import {
  ProgressSyncProvider,
  clearLocalProgress,
  readLocalProgress,
  saveLocalProgress,
  useProgressSync,
} from '@/lib/reading-progress';
import { ApiError } from '@/types/api';

/**
 * Момент слияния и блокировка восстановления на время слияния.
 *
 * 🔴 `isSettled` обязан быть `false`, пока слияние не закончено. Разреши
 * восстановление раньше — читалка покажет серверную 5-ю главу вместо локальной
 * 12-й, а через три секунды отложенное сохранение запишет эту 5-ю на сервер.
 * Дефект сам себя закрепляет: он не только показывает не то место, он его и
 * записывает.
 *
 * 🔴 Слияние повешено на состояние сессии, а не на обработчик формы входа.
 * Единой точки «после логина» в коде нет: вход по паролю идёт через
 * `router.push`, а после возврата от Google клиентский код формы не исполняется
 * вовсе. Перевесят на форму — слияние перестанет работать для OAuth, и заметит
 * это только тот, кто входит через Google.
 */

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' };

vi.mock('next-auth/react', () => ({
  useSession: () => sessionState,
}));

vi.mock('@/api/endpoints/progress', () => ({
  getProgress: vi.fn(),
  updateTextProgress: vi.fn(),
}));

const getProgressMock = vi.mocked(getProgress);
const updateTextProgressMock = vi.mocked(updateTextProgress);

const Probe = () => {
  const { isSettled } = useProgressSync();
  return <span data-testid="settled">{String(isSettled)}</span>;
};

const renderProvider = (children: ReactNode = <Probe />) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProgressSyncProvider>{children}</ProgressSyncProvider>
    </QueryClientProvider>
  );
};

const renderProviderStrict = (children: ReactNode = <Probe />) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ProgressSyncProvider>{children}</ProgressSyncProvider>
      </QueryClientProvider>
    </StrictMode>
  );
};

const settled = () => screen.getByTestId('settled').textContent;

describe('ProgressSyncProvider', () => {
  beforeEach(() => {
    clearLocalProgress();
    getProgressMock.mockReset();
    updateTextProgressMock.mockReset();
    updateTextProgressMock.mockResolvedValue(undefined);
    sessionState.data = null;
    sessionState.status = 'unauthenticated';
  });

  afterEach(() => {
    clearLocalProgress();
  });

  it('анониму сливать нечего — восстановление разрешено сразу', () => {
    renderProvider();

    expect(settled()).toBe('true');
    expect(getProgressMock).not.toHaveBeenCalled();
  });

  it('пока сессия грузится, восстановление запрещено', () => {
    sessionState.data = undefined;
    sessionState.status = 'loading';

    renderProvider();

    expect(settled()).toBe('false');
  });

  it('вошедший с пустым хранилищем не делает ни одного запроса', async () => {
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';

    renderProvider();

    await waitFor(() => expect(settled()).toBe('true'));
    expect(getProgressMock).not.toHaveBeenCalled();
    expect(updateTextProgressMock).not.toHaveBeenCalled();
  });

  it('вошедший с локальным прогрессом: восстановление ждёт слияния', async () => {
    saveLocalProgress({
      versionId: 'v1',
      ownerId: null,
      kind: 'text',
      chapterNumber: 12,
      position: 0,
    });
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    getProgressMock.mockResolvedValue(null);

    renderProvider();

    // Первый кадр: слияние ещё не отработало, читалке нельзя восстанавливаться.
    expect(settled()).toBe('false');

    await waitFor(() => expect(settled()).toBe('true'));
    expect(updateTextProgressMock).toHaveBeenCalledWith('v1', { chapterNumber: 12, position: 0 });
    expect(readLocalProgress('v1')).toBeNull();
  });

  /**
   * 🔴 `reactStrictMode: true` в `next.config.js` заставляет React прогнать
   * setup → cleanup → setup. Если результат первого слияния отбросить по признаку
   * размонтирования, второй заход упирается в флаг «слияние идёт» и выходит,
   * а третьего не будет: зависимости эффекта не меняются. `isSettled` остался бы
   * `false` на весь визит — ни восстановления, ни сохранения, и ничего на экране.
   */
  it('двойной прогон эффектов в StrictMode не запирает восстановление', async () => {
    saveLocalProgress({
      versionId: 'v1',
      ownerId: null,
      kind: 'text',
      chapterNumber: 12,
      position: 0,
    });
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    getProgressMock.mockResolvedValue(null);

    renderProviderStrict();

    await waitFor(() => expect(settled()).toBe('true'));
  });

  /**
   * 🔴 Сессия без `user.id` — тоже улаженное состояние: сливать в неё
   * всё равно некуда. Иначе она заперла бы и восстановление, и сохранение навсегда.
   */
  it('вошедший без идентификатора не блокирует восстановление', () => {
    sessionState.data = { user: {} };
    sessionState.status = 'authenticated';

    renderProvider();

    expect(settled()).toBe('true');
    expect(getProgressMock).not.toHaveBeenCalled();
  });

  /**
   * 🔴 В `lib/http.ts` нет ни таймаута, ни `AbortSignal`: зависший запрос не
   * отвалится сам. Без дедлайна читатель с плохой сетью не сохранил бы ни
   * одной главы за весь визит, и на экране это никак не видно.
   */
  it('зависшее слияние разблокируется по дедлайну', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    saveLocalProgress({
      versionId: 'v1',
      ownerId: null,
      kind: 'text',
      chapterNumber: 12,
      position: 0,
    });
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    // Запрос, который не завершится никогда.
    getProgressMock.mockImplementation(() => new Promise(() => {}));

    renderProvider();
    expect(settled()).toBe('false');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(settled()).toBe('true');
    vi.useRealTimers();
  });

  /**
   * 🔴 Отказ сети не должен запирать читалку навсегда: без снятия блокировки
   * книга осталась бы на первой главе до перезагрузки страницы.
   */
  it('отказ слияния всё равно разблокирует восстановление', async () => {
    saveLocalProgress({
      versionId: 'v1',
      ownerId: null,
      kind: 'text',
      chapterNumber: 12,
      position: 0,
    });
    sessionState.data = { user: { id: 'u1' } };
    sessionState.status = 'authenticated';
    getProgressMock.mockResolvedValue(null);
    updateTextProgressMock.mockRejectedValue(new ApiError({ message: 'boom', statusCode: 502 }));

    renderProvider();

    await waitFor(() => expect(settled()).toBe('true'));
    expect(readLocalProgress('v1')?.text).toMatchObject({ chapterNumber: 12 });
  });
});
