import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalysisTab } from '@/components/admin/books/AnalysisTab/useAnalysisTab';
import { ApiError } from '@/types/api';
import type { BookAnalysisSaveResponse, DossierStatus } from '@/types/api-schema';

/**
 * Вкладка анализа (F03-1, `product.md` §21 п.3): предупреждения сервера видны после сохранения
 * и не пропадают; пробное сохранение (`dryRun`, А3) показывает ядро и отказ до применения импорта.
 */

const mocks = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  analysis: {
    data: null,
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    error: null,
  } as {
    data: unknown;
    isLoading: boolean;
    isSuccess: boolean;
    isFetching?: boolean;
    /** Не задан — выводится из `isFetching`, как у react-query без паузы. */
    fetchStatus?: 'idle' | 'fetching' | 'paused';
    error: unknown;
  },
  loadValidation: null as null | (() => Promise<unknown>),
  dossier: null as Partial<DossierStatus> | null,
  dossierError: false,
  sourceError: false,
  dossierEnabled: [] as boolean[],
  /** Язык исходной версии досье; `undefined` — не загружен. */
  sourceLanguage: undefined as string | undefined,
  /** Досье загружено, а фоновое перечитывание упало: данные есть и `isError`. */
  dossierRefetchError: false,
  /** Последний ход анализа версии (`useAnalysisWrite`); `null` — хода нет. */
  run: null as unknown,
  /** Состояние запроса хода: `pending` — ответа ещё нет, `error` — не загрузился. */
  runState: 'success' as 'success' | 'pending' | 'error',
  /** Мутации записи хода в полёте (`useAnalysisWritesInFlight`). */
  writesInFlight: false,
  writesFor: [] as string[],
  refetch: vi.fn(),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/api/hooks', async () => {
  const keys =
    await vi.importActual<typeof import('@/api/hooks/draftKeys')>('@/api/hooks/draftKeys');
  return {
    isRegenRunning: keys.isRegenRunning,
    useAnalysisWritesInFlight: (versionId: string) => {
      mocks.writesFor.push(versionId);
      return mocks.writesInFlight;
    },
    useBookAnalysis: () => ({
      fetchStatus: mocks.analysis.isFetching ? 'fetching' : 'idle',
      refetch: mocks.refetch,
      ...mocks.analysis,
    }),
    useBookVersion: (_id: string, opts: { enabled: boolean }) => ({
      data: opts.enabled && mocks.sourceLanguage ? { language: mocks.sourceLanguage } : undefined,
      isError: opts.enabled && mocks.sourceError,
    }),
    useChapterTitles: () => ({
      data: { items: [{ number: 1, title: 'One' }], pagination: { total: 1 } },
    }),
    useVersionDossier: (_v: string, enabled: boolean) => {
      mocks.dossierEnabled.push(enabled);
      return {
        data: enabled && !mocks.dossierError ? (mocks.dossier ?? undefined) : undefined,
        isError: enabled && (mocks.dossierError || mocks.dossierRefetchError),
      };
    },
    useAnalysisWrite: (_v: string, enabled: boolean) => ({
      data: enabled && mocks.runState === 'success' ? { draft: mocks.run } : undefined,
      isError: enabled && mocks.runState === 'error',
    }),
    useSaveBookAnalysis: () => ({
      mutate: mocks.mutate,
      mutateAsync: mocks.mutateAsync,
      isPending: false,
    }),
  };
});

vi.mock('@/lib/admin/load-book-analysis-validation', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/lib/admin/load-book-analysis-validation')>();
  return {
    loadBookAnalysisValidation: () =>
      mocks.loadValidation ? mocks.loadValidation() : original.loadBookAnalysisValidation(),
  };
});

const props = {
  versionId: 'v1',
  version: {
    title: 'T',
    author: 'A',
    language: 'en' as const,
    firstPublishedYear: 1866,
    characters: null,
    quotes: null,
  },
};

const emptySaved = {
  language: 'en',
  facts: null,
  mainIdea: null,
  themes: null,
  characters: null,
  symbols: null,
  keyQuotes: null,
  titleMeaning: null,
  endingMeaning: null,
  context: null,
  timeline: null,
  style: null,
  reception: null,
  adaptations: null,
  misreadings: null,
  discussionQuestions: null,
  faq: null,
  sources: null,
  createdAt: '2026-10-17T00:00:00.000Z',
  updatedAt: '2026-10-17T00:00:00.000Z',
};

const response: BookAnalysisSaveResponse = {
  analysis: null,
  hasCore: false,
  warnings: [
    { code: 'chapter_not_found', path: 'themes.0.chapters.0', message: 'chapter 9' },
    { code: 'core_incomplete', path: 'keyQuotes', message: 'keyQuotes: 1 of 3' },
  ],
};

describe('useAnalysisTab', () => {
  // Модуль проверок грузится лениво (zod): первый импорт под нагрузкой дольше срока `waitFor`.
  // Прогрев до тестов — ожидание в тесте меряет хук, а не холодную сборку модуля.
  beforeAll(async () => {
    await import('@/lib/admin/book-analysis-validation');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Реализации моков из прошлых тестов снимаются: `clearAllMocks` чистит только историю.
    mocks.mutate.mockReset();
    mocks.mutateAsync.mockReset();
    mocks.analysis = { data: null, isLoading: false, isSuccess: true, error: null };
    mocks.loadValidation = null;
    mocks.dossier = null;
    mocks.dossierRefetchError = false;
    mocks.run = null;
    mocks.runState = 'success';
    mocks.writesInFlight = false;
    mocks.writesFor = [];
    mocks.dossierError = false;
    mocks.sourceError = false;
    mocks.dossierEnabled = [];
    mocks.sourceLanguage = undefined;
    mocks.refetch.mockReset();
    mocks.mutateAsync.mockResolvedValue({ analysis: null, hasCore: false, warnings: [] });
  });

  it('сохранение шлёт всю запись на языке версии и показывает предупреждения сервера', async () => {
    mocks.mutate.mockImplementation((_vars, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(response)
    );
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    act(() => result.current.setText('mainIdea', '  Idea.  '));
    act(() => result.current.handleSave());

    const vars = mocks.mutate.mock.calls[0][0] as {
      versionId: string;
      data: Record<string, unknown>;
    };
    expect(vars.versionId).toBe('v1');
    expect(vars.data.language).toBe('en');
    expect(vars.data.mainIdea).toBe('Idea.');
    expect(vars.data).toHaveProperty('themes', null);
    expect(result.current.lastCheck).toEqual({ hasCore: false, warnings: response.warnings });
  });

  it('пробное сохранение: ядро и предупреждения; отказ сервера — текстом ошибки', async () => {
    mocks.mutateAsync.mockResolvedValueOnce(response);
    const { result } = renderHook(() => useAnalysisTab(props));
    const ok = await result.current.previewImport({ language: 'en', mainIdea: 'X' });
    expect(mocks.mutateAsync.mock.calls[0][0]).toMatchObject({ versionId: 'v1', dryRun: true });
    expect(ok).toEqual({ state: 'ok', check: { hasCore: false, warnings: response.warnings } });

    mocks.mutateAsync.mockRejectedValueOnce(
      new ApiError({ message: 'characters.0.themeKeys.0: unknown theme key', statusCode: 400 })
    );
    const bad = await result.current.previewImport({ language: 'en' });
    expect(bad).toEqual({
      state: 'rejected',
      message: 'characters.0.themeKeys.0: unknown theme key',
    });

    mocks.mutateAsync.mockRejectedValueOnce(new Error('Failed to fetch'));
    const failed = await result.current.previewImport({ language: 'en' });
    expect(failed).toEqual({ state: 'failed', message: 'Failed to fetch' });
  });

  it('ошибка в JSON-редакторе стопорит сохранение', async () => {
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    act(() => result.current.setListText('faq', '[{"question":""}]'));
    act(() => result.current.handleSave());
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Fix the errors in the JSON blocks first', {
      variant: 'warning',
    });
  });

  it('ошибка чтения анализа не заполняет форму; заполнение — после успешного ответа', async () => {
    mocks.analysis = {
      data: undefined,
      isLoading: false,
      isSuccess: false,
      error: new Error('500'),
    };
    const { result, rerender } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    // Форма не заполнена из ошибки: набранное держится, ошибка видна, сохранение не уходит.
    act(() => result.current.setText('mainIdea', 'typed'));
    expect(result.current.form.texts.mainIdea).toBe('typed');
    expect(result.current.loadError).toBeInstanceOf(Error);
    // Ошибка — не загрузка: вкладка показывает отказ с повтором, а не вечный спиннер.
    expect(result.current.isLoading).toBe(false);
    act(() => result.current.handleSave());
    expect(mocks.mutate).not.toHaveBeenCalled();
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Saved idea', hasCore: true },
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    rerender();
    expect(result.current.form.texts.mainIdea).toBe('Saved idea');
  });

  it('запрос на паузе офлайн: загрузка, а не пустая форма; Save ничего не шлёт, ответ после сети заполняет', async () => {
    mocks.analysis = {
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isFetching: false,
      fetchStatus: 'paused',
      error: null,
    };
    const { result, rerender } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.handleSave());
    expect(mocks.mutate).not.toHaveBeenCalled();
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Saved idea', hasCore: true },
      isLoading: false,
      isSuccess: true,
      isFetching: false,
      error: null,
    };
    rerender();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.form.texts.mainIdea).toBe('Saved idea');
    act(() => result.current.handleSave());
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it('перечитывание на паузе офлайн поверх устаревшего кэша форму не заполняет; Save ждёт свежего ответа', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Stale idea', hasCore: true },
      isLoading: false,
      isSuccess: true,
      isFetching: false,
      fetchStatus: 'paused',
      error: null,
    };
    const { result, rerender } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.form.texts.mainIdea).not.toBe('Stale idea');
    act(() => result.current.handleSave());
    expect(mocks.mutate).not.toHaveBeenCalled();
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Fresh idea', hasCore: true },
      isLoading: false,
      isSuccess: true,
      isFetching: false,
      error: null,
    };
    rerender();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.form.texts.mainIdea).toBe('Fresh idea');
  });

  it('перечитывание на паузе или в полёте после заполнения не прячет форму и не держит Save', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Saved idea', hasCore: true },
      isLoading: false,
      isSuccess: true,
      isFetching: false,
      error: null,
    };
    const { result, rerender } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    act(() => result.current.setText('mainIdea', 'Edited'));
    for (const refetch of [
      { isFetching: false, fetchStatus: 'paused' as const },
      { isFetching: true, fetchStatus: 'fetching' as const },
    ]) {
      mocks.analysis = { ...mocks.analysis, ...refetch };
      rerender();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.form.texts.mainIdea).toBe('Edited');
    }
    act(() => result.current.handleSave());
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
  });

  it('правка списка до загрузки проверки держит сохранение и проверяется после загрузки', async () => {
    let release: () => void = () => undefined;
    const real = await import('@/lib/admin/book-analysis-validation');
    mocks.loadValidation = () =>
      new Promise((resolve) => {
        release = () => resolve(real);
      });
    const { result } = renderHook(() => useAnalysisTab(props));
    act(() => result.current.setListText('faq', '[{"question":"Q","answer":"A"}]'));
    // Непроверенный текст виден как непроверенный и держит сохранение.
    expect(result.current.form.drafts.faq.issues?.length).toBe(1);
    act(() => result.current.handleSave());
    expect(mocks.mutate).not.toHaveBeenCalled();

    await act(async () => release());
    await waitFor(() => expect(result.current.form.drafts.faq.issues).toBeNull());
    expect(result.current.form.lists.faq).toEqual([{ question: 'Q', answer: 'A' }]);
    act(() => result.current.handleSave());
    const vars = mocks.mutate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(vars.data.faq).toEqual([{ question: 'Q', answer: 'A' }]);
  });

  it('4xx сохранения — тост с текстом отказа сервера', async () => {
    mocks.mutate.mockImplementation((_vars, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new ApiError({ message: 'themes.0.key: duplicate key', statusCode: 400 }))
    );
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    act(() => result.current.handleSave());
    expect(mocks.enqueueSnackbar).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('themes.0.key: duplicate key', {
      variant: 'error',
    });
  });

  it('сбой фонового перечитывания после заполнения не прячет форму', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Saved', hasCore: true },
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    const { result, rerender } = renderHook(() => useAnalysisTab(props));
    act(() => result.current.setText('mainIdea', 'edited'));
    mocks.analysis = { ...mocks.analysis, error: new Error('network') };
    rerender();
    expect(result.current.loadError).toBeNull();
    expect(result.current.form.texts.mainIdea).toBe('edited');
  });

  it('проба при открытии не удалась — причина видна, повтор шлёт пробу снова', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Idea', hasCore: false },
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    mocks.mutateAsync
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce(response);
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.savedCheckError).toBe('Failed to fetch'));
    act(() => result.current.retrySavedCheck());
    await waitFor(() =>
      expect(result.current.lastCheck).toEqual({ hasCore: false, warnings: response.warnings })
    );
    expect(result.current.savedCheckError).toBeNull();
  });

  it('ответ пробы при открытии, пришедший после сохранения, не перетирает итог сохранения', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Idea', hasCore: false },
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    let resolveProbe: (v: unknown) => void = () => undefined;
    mocks.mutateAsync.mockImplementationOnce(() => new Promise((r) => (resolveProbe = r)));
    const saved = { analysis: null, hasCore: true, warnings: [] };
    mocks.mutate.mockImplementation((_vars, opts: { onSuccess: (r: unknown) => void }) =>
      opts.onSuccess(saved)
    );
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    act(() => result.current.handleSave());
    await act(async () => resolveProbe(response));
    expect(result.current.lastCheck).toEqual({ hasCore: true, warnings: [] });
  });

  it('5xx сохранения — без второго тоста (его показывает глобальный обработчик)', async () => {
    mocks.mutate.mockImplementation((_vars, opts: { onError: (e: unknown) => void }) =>
      opts.onError(new ApiError({ message: 'boom', statusCode: 503 }))
    );
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    act(() => result.current.handleSave());
    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.enqueueSnackbar).not.toHaveBeenCalledWith('boom', { variant: 'error' });
  });

  it('сохранённый анализ без ядра: при открытии вкладки — проба и список недостающего', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Idea', hasCore: false },
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    mocks.mutateAsync.mockResolvedValue(response);
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() =>
      expect(result.current.lastCheck).toEqual({ hasCore: false, warnings: response.warnings })
    );
    expect(mocks.mutateAsync.mock.calls[0][0]).toMatchObject({ dryRun: true });
  });

  it.each([403, 429, 503])(
    'проба: ApiError %i — сбой проверки, а не «данные отвергнуты»',
    async (status) => {
      mocks.mutateAsync.mockRejectedValueOnce(new ApiError({ message: 'x', statusCode: status }));
      const { result } = renderHook(() => useAnalysisTab(props));
      const res = await result.current.previewImport({ language: 'en' });
      expect(res.state).toBe('failed');
    }
  );

  it('отказ проверки массивом — по строке на ошибку', async () => {
    mocks.mutateAsync.mockRejectedValueOnce(
      new ApiError({
        message: 'a, b',
        statusCode: 400,
        data: { message: ['themes.0.key: duplicate', 'keyQuotes.0.speakerKey: unknown'] },
      })
    );
    const { result } = renderHook(() => useAnalysisTab(props));
    const res = await result.current.previewImport({ language: 'en' });
    expect(res).toEqual({
      state: 'rejected',
      message: 'themes.0.key: duplicate\nkeyQuotes.0.speakerKey: unknown',
    });
  });

  it('повтор пробы при открытии проверяет сохранённую запись, а не несохранённые правки', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Saved', hasCore: false },
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    mocks.mutateAsync
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValue(response);
    const { result } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.savedCheckError).toBe('Failed to fetch'));
    act(() => result.current.setText('mainIdea', 'Unsaved edit'));
    act(() => result.current.retrySavedCheck());
    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(2));
    const body = mocks.mutateAsync.mock.calls[1][0] as { data: Record<string, unknown> };
    expect(body.data.mainIdea).toBe('Saved');
  });

  it('устаревший кэш при перечитывании: загрузка, Save ничего не шлёт, форма ждёт свежих данных', async () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Stale', hasCore: true },
      isLoading: false,
      isSuccess: true,
      isFetching: true,
      error: null,
    } as typeof mocks.analysis;
    const { result, rerender } = renderHook(() => useAnalysisTab(props));
    await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
    expect(result.current.form.texts.mainIdea).toBe('');
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.handleSave());
    expect(mocks.mutate).not.toHaveBeenCalled();
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Fresh', hasCore: true },
      isLoading: false,
      isSuccess: true,
      isFetching: false,
      error: null,
    } as typeof mocks.analysis;
    rerender();
    expect(result.current.form.texts.mainIdea).toBe('Fresh');
  });

  describe('сверка записи (LEGACY-496)', () => {
    const row = (updatedAt: string) => ({ language: 'en', hasCore: false, updatedAt });
    const freshResult = (data: unknown) => ({
      status: 'success',
      data,
      dataUpdatedAt: Date.now() + 60_000,
    });
    const ready = async (data: unknown) => {
      mocks.analysis = { ...mocks.analysis, data } as typeof mocks.analysis;
      const hook = renderHook(() => useAnalysisTab(props));
      await waitFor(() => expect(hook.result.current.analyzeImport).not.toBeNull());
      return hook;
    };

    it('загруженный null - признак «записи нет», запись - её updatedAt', async () => {
      const empty = await ready(null);
      act(() => empty.result.current.handleSave());
      expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
        expected: { expectedAbsent: 'true' },
      });
      empty.unmount();

      mocks.mutate.mockClear();
      const loaded = await ready(row('2026-10-12T00:00:00.000Z'));
      act(() => loaded.result.current.handleSave());
      expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-12T00:00:00.000Z' },
      });
    });

    it('кэш ушёл вперёд без формы: сохранение идёт с точкой сверки формы', async () => {
      const { result, rerender } = await ready(row('2026-10-12T00:00:00.000Z'));
      mocks.analysis = {
        ...mocks.analysis,
        data: row('2026-10-13T00:00:00.000Z'),
      } as typeof mocks.analysis;
      rerender();
      act(() => result.current.handleSave());
      expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-12T00:00:00.000Z' },
      });
    });

    it('409 RECORD_CHANGED: предупреждение и перечитывание, следующее сохранение со свежей сверкой', async () => {
      mocks.mutate.mockImplementationOnce((_vars, opts: { onError: (e: Error) => void }) =>
        opts.onError(
          new ApiError({
            statusCode: 409,
            message: 'changed',
            error: 'Conflict',
            data: { code: 'RECORD_CHANGED' },
          })
        )
      );
      mocks.refetch.mockResolvedValue(freshResult(row('2026-10-13T00:00:00.000Z')));
      const { result } = await ready(row('2026-10-12T00:00:00.000Z'));
      await act(async () => result.current.handleSave());

      expect(mocks.refetch).toHaveBeenCalledTimes(1);
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        expect.stringContaining('changed on the server'),
        { variant: 'warning' }
      );
      expect(mocks.enqueueSnackbar).not.toHaveBeenCalledWith(expect.anything(), {
        variant: 'error',
      });

      act(() => result.current.handleSave());
      expect(mocks.mutate.mock.calls[1]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-13T00:00:00.000Z' },
      });
    });

    it('409 по блоку с правкой: своё остаётся, текст сервера показан и копится', async () => {
      mocks.mutate.mockImplementationOnce((_vars, opts: { onError: (e: Error) => void }) =>
        opts.onError(
          new ApiError({
            statusCode: 409,
            message: 'changed',
            error: 'Conflict',
            data: { code: 'RECORD_CHANGED' },
          })
        )
      );
      const theirs = { ...row('2026-10-13T00:00:00.000Z'), mainIdea: 'Theirs.' };
      mocks.refetch.mockResolvedValue(freshResult(theirs));
      const { result } = await ready(row('2026-10-12T00:00:00.000Z'));
      act(() => result.current.setText('mainIdea', 'Mine.'));
      await act(async () => result.current.handleSave());
      await waitFor(() => expect(result.current.serverBlocks.mainIdea).toBe('Theirs.'));
      expect(result.current.form.texts.mainIdea).toBe('Mine.');

      // Следующее перечитывание без новых правок показ не снимает.
      await act(() => result.current.reloadBlocks());
      expect(result.current.serverBlocks.mainIdea).toBe('Theirs.');

      // Правка совпала с сервером - показывать нечего.
      act(() => result.current.setText('mainIdea', 'Theirs.'));
      expect(result.current.serverBlocks).toEqual({});
    });

    it('блок, который форма взяла с сервера, из показа уходит и старый текст не возвращается', async () => {
      mocks.refetch.mockResolvedValueOnce(
        freshResult({ ...row('2026-10-13T00:00:00.000Z'), mainIdea: 'S1.' })
      );
      const { result } = await ready(row('2026-10-12T00:00:00.000Z'));
      act(() => result.current.setText('mainIdea', 'Mine.'));
      await act(() => result.current.reloadBlocks());
      expect(result.current.serverBlocks.mainIdea).toBe('S1.');

      // Редактор принял текст сервера: правка совпала, следующая запись на сервере приходит в форму.
      act(() => result.current.setText('mainIdea', 'S1.'));
      mocks.refetch.mockResolvedValueOnce(
        freshResult({ ...row('2026-10-14T00:00:00.000Z'), mainIdea: 'S2.' })
      );
      await act(() => result.current.reloadBlocks());
      expect(result.current.form.texts.mainIdea).toBe('S2.');
      expect(result.current.serverBlocks).toEqual({});
    });

    it('своё сохранение сдвигает точку сверки и снимает показ', async () => {
      const saved = { ...row('2026-10-14T00:00:00.000Z'), mainIdea: 'A.', chapterNumbers: [] };
      mocks.mutate.mockImplementationOnce((_vars, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({ analysis: saved, hasCore: false, warnings: [] })
      );
      const { result } = await ready(row('2026-10-12T00:00:00.000Z'));
      act(() => result.current.setText('mainIdea', 'A.'));
      act(() => result.current.handleSave());
      act(() => result.current.handleSave());
      expect(mocks.mutate.mock.calls[1]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-14T00:00:00.000Z' },
      });
      expect(result.current.serverBlocks).toEqual({});
    });

    it('другой 409 не считается чужой правкой', async () => {
      mocks.mutate.mockImplementationOnce((_vars, opts: { onError: (e: Error) => void }) =>
        opts.onError(new ApiError({ statusCode: 409, message: 'other', error: 'Conflict' }))
      );
      const { result } = await ready(row('2026-10-12T00:00:00.000Z'));
      act(() => result.current.handleSave());
      expect(mocks.refetch).not.toHaveBeenCalled();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('other', { variant: 'error' });
    });
  });

  describe('reloadBlocks: ход записал блоки (F07-3a)', () => {
    // Отметки ответа заведомо после и до начала перечитывания: без гонки с часами теста.
    const FRESH = Number.MAX_SAFE_INTEGER;
    const STALE = 0;
    const hydrate = async () => {
      mocks.analysis = {
        data: { ...emptySaved, mainIdea: 'Old idea', context: 'Old context', hasCore: true },
        isLoading: false,
        isSuccess: true,
        isFetching: false,
        error: null,
      } as typeof mocks.analysis;
      const hook = renderHook(() => useAnalysisTab(props));
      await waitFor(() => expect(hook.result.current.form.texts.mainIdea).toBe('Old idea'));
      return hook;
    };
    const server = {
      ...emptySaved,
      mainIdea: 'Run idea',
      context: 'Run context',
      themes: [{ key: 'home', title: 'Home', interpretation: 'Why' }],
      hasCore: true,
    };

    it('перечитывает анализ: неправленые блоки — с сервера, правленый остаётся, о нём предупреждение', async () => {
      const { result } = await hydrate();
      act(() => result.current.setText('context', 'My edit'));
      mocks.refetch.mockResolvedValueOnce({
        status: 'success',
        data: server,
        dataUpdatedAt: FRESH,
      });
      await act(() => result.current.reloadBlocks());
      expect(mocks.refetch).toHaveBeenCalledTimes(1);
      expect(result.current.form.texts.mainIdea).toBe('Run idea');
      expect(result.current.form.lists.themes).toEqual(server.themes);
      expect(result.current.form.texts.context).toBe('My edit');
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        expect.stringContaining('your edits are kept: context'),
        { variant: 'warning' }
      );
    });

    it('сохранение после перечитывания шлёт записанное ходом, а не прежнее', async () => {
      const { result } = await hydrate();
      mocks.refetch.mockResolvedValueOnce({
        status: 'success',
        data: server,
        dataUpdatedAt: FRESH,
      });
      await act(() => result.current.reloadBlocks());
      await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
      act(() => result.current.handleSave());
      const vars = mocks.mutate.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(vars.data.mainIdea).toBe('Run idea');
      // Проверка списков дописывает пустые поля `null`: сверяется содержимое, а не форма записи.
      expect(vars.data.themes).toMatchObject(server.themes);
    });

    it('проба после перечитывания — с языком версии на момент вызова, а не на момент создания (без устаревшего замыкания)', async () => {
      mocks.analysis = {
        data: { ...emptySaved, mainIdea: 'Old idea', hasCore: true },
        isLoading: false,
        isSuccess: true,
        isFetching: false,
        error: null,
      } as typeof mocks.analysis;
      const { result, rerender } = renderHook((p: typeof props) => useAnalysisTab(p), {
        initialProps: props,
      });
      await waitFor(() => expect(result.current.form.texts.mainIdea).toBe('Old idea'));
      rerender({ ...props, version: { ...props.version, language: 'fr' as never } });
      mocks.refetch.mockResolvedValueOnce({
        status: 'success',
        data: { ...emptySaved, mainIdea: 'Run idea', hasCore: false },
        dataUpdatedAt: FRESH,
      });
      await act(() => result.current.reloadBlocks());
      await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalled());
      const probe = mocks.mutateAsync.mock.calls.at(-1)?.[0] as {
        dryRun: boolean;
        data: { language: string; mainIdea: string };
      };
      expect(probe.dryRun).toBe(true);
      expect(probe.data.language).toBe('fr');
      expect(probe.data.mainIdea).toBe('Run idea');
    });

    it('два вызова подряд — два перечитывания по очереди, без ложной «устаревшей» формы; третий в очередь не встаёт', async () => {
      const { result } = await hydrate();
      const answers: Array<(v: unknown) => void> = [];
      mocks.refetch.mockImplementation(() => new Promise((r) => answers.push(r)));
      let first: Promise<void> = Promise.resolve();
      act(() => {
        first = result.current.reloadBlocks();
        void result.current.reloadBlocks();
        void result.current.reloadBlocks();
      });
      // Второе перечитывание не стартует, пока идёт первое: refetch не отменяют друг друга.
      expect(mocks.refetch).toHaveBeenCalledTimes(1);
      await act(async () => {
        answers[0]({ status: 'success', data: server, dataUpdatedAt: FRESH });
      });
      await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(2));
      await act(async () => {
        answers[1]({ status: 'success', data: server, dataUpdatedAt: FRESH });
        await first;
      });
      expect(mocks.refetch).toHaveBeenCalledTimes(2);
      expect(result.current.formStale).toBe(false);
      expect(result.current.form.texts.mainIdea).toBe('Run idea');
    });

    it('сменилась версия, пока шло перечитывание: следующее в очереди идёт за новой версией', async () => {
      mocks.analysis = {
        data: { ...emptySaved, mainIdea: 'Old idea', hasCore: true },
        isLoading: false,
        isSuccess: true,
        isFetching: false,
        error: null,
      } as typeof mocks.analysis;
      const { result, rerender } = renderHook((p: typeof props) => useAnalysisTab(p), {
        initialProps: props,
      });
      await waitFor(() => expect(result.current.form.texts.mainIdea).toBe('Old idea'));
      const answers: Array<(v: unknown) => void> = [];
      mocks.refetch.mockImplementation(() => new Promise((r) => answers.push(r)));
      let first: Promise<void> = Promise.resolve();
      act(() => {
        first = result.current.reloadBlocks();
      });
      rerender({ ...props, versionId: 'v2' });
      act(() => {
        void result.current.reloadBlocks();
      });
      await act(async () => {
        answers[0]({ status: 'success', data: server, dataUpdatedAt: FRESH });
      });
      await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(2));
      await act(async () => {
        answers[1]({ status: 'success', data: server, dataUpdatedAt: FRESH });
        await first;
      });
      expect(result.current.form.texts.mainIdea).toBe('Run idea');
    });

    it('пока идёт перечитывание — «Save analysis» закрыт с пояснением', async () => {
      const { result } = await hydrate();
      await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
      let answer: (v: unknown) => void = () => undefined;
      mocks.refetch.mockReturnValueOnce(new Promise((r) => (answer = r)));
      let pending: Promise<void> = Promise.resolve();
      act(() => {
        pending = result.current.reloadBlocks();
      });
      expect(result.current.saveBlockedReason).toBe(
        'The analysis is being reloaded from the server: save when it ends.'
      );
      act(() => result.current.handleSave());
      expect(mocks.mutate).not.toHaveBeenCalled();
      await act(async () => {
        answer({ status: 'success', data: server, dataUpdatedAt: FRESH });
        await pending;
      });
      expect(result.current.saveBlockedReason).toBeNull();
    });

    it('перечитывание не удалось — форма прежняя, «Save analysis» стоит до свежего ответа', async () => {
      const { result } = await hydrate();
      await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
      mocks.refetch.mockResolvedValue({ status: 'error', data: undefined, dataUpdatedAt: STALE });
      await act(() => result.current.reloadBlocks());
      expect(result.current.form.texts.mainIdea).toBe('Old idea');
      expect(result.current.formStale).toBe(true);
      act(() => result.current.handleSave());
      expect(mocks.mutate).not.toHaveBeenCalled();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        'The analysis changed on the server: reload it before saving',
        { variant: 'warning' }
      );
      // Повтор со свежим ответом снимает запрет и подставляет записанное ходом.
      mocks.refetch.mockReset();
      mocks.refetch.mockResolvedValue({ status: 'success', data: server, dataUpdatedAt: FRESH });
      await act(() => result.current.reloadBlocks());
      expect(result.current.formStale).toBe(false);
      expect(result.current.form.texts.mainIdea).toBe('Run idea');
      act(() => result.current.handleSave());
      expect(mocks.mutate).toHaveBeenCalledTimes(1);
    });

    it('устаревший ответ — ещё одна попытка; свежий со второй — подставлен', async () => {
      const { result } = await hydrate();
      mocks.refetch
        .mockResolvedValueOnce({ status: 'success', data: emptySaved, dataUpdatedAt: STALE })
        .mockResolvedValueOnce({ status: 'success', data: server, dataUpdatedAt: FRESH });
      await act(() => result.current.reloadBlocks());
      expect(mocks.refetch).toHaveBeenCalledTimes(2);
      expect(result.current.form.texts.mainIdea).toBe('Run idea');
      expect(result.current.formStale).toBe(false);
    });

    it('устаревший ответ дважды — форма помечена устаревшей', async () => {
      const { result } = await hydrate();
      mocks.refetch.mockResolvedValue({ status: 'success', data: server, dataUpdatedAt: STALE });
      await act(() => result.current.reloadBlocks());
      expect(mocks.refetch).toHaveBeenCalledTimes(2);
      expect(result.current.form.texts.mainIdea).toBe('Old idea');
      expect(result.current.formStale).toBe(true);
    });

    it('версия сменилась, пока шёл запрос — ответ не подставляется и форма не помечается', async () => {
      const { result, rerender } = await (async () => {
        mocks.analysis = {
          data: { ...emptySaved, mainIdea: 'Old idea', hasCore: true },
          isLoading: false,
          isSuccess: true,
          isFetching: false,
          error: null,
        } as typeof mocks.analysis;
        const hook = renderHook((p: typeof props) => useAnalysisTab(p), { initialProps: props });
        await waitFor(() => expect(hook.result.current.form.texts.mainIdea).toBe('Old idea'));
        return hook;
      })();
      let answer: (v: unknown) => void = () => undefined;
      mocks.refetch.mockReturnValueOnce(new Promise((r) => (answer = r)));
      let pending: Promise<void> = Promise.resolve();
      act(() => {
        pending = result.current.reloadBlocks();
      });
      // Другая версия: её гидрация — из её ответа, ответ прошлой версии сюда не ложится.
      mocks.analysis = {
        data: { ...emptySaved, mainIdea: 'Second version', hasCore: true },
        isLoading: false,
        isSuccess: true,
        isFetching: false,
        error: null,
      } as typeof mocks.analysis;
      rerender({ ...props, versionId: 'v2' });
      await waitFor(() => expect(result.current.form.texts.mainIdea).toBe('Second version'));
      await act(async () => {
        answer({ status: 'success', data: server, dataUpdatedAt: FRESH });
        await pending;
      });
      expect(result.current.form.texts.mainIdea).toBe('Second version');
      expect(result.current.formStale).toBe(false);
    });

    it('форма ещё не заполнена — перечитывание её не трогает и не помечает', async () => {
      mocks.analysis = { data: null, isLoading: true, isSuccess: false, error: null };
      const { result } = renderHook(() => useAnalysisTab(props));
      mocks.refetch.mockResolvedValue({ status: 'error', data: undefined, dataUpdatedAt: STALE });
      await act(() => result.current.reloadBlocks());
      expect(result.current.formStale).toBe(false);
      expect(result.current.form.texts.mainIdea).toBe('');
    });

    it('после «Save analysis» снимок — ответ сервера: правка блока, который ход не менял, не даёт ложного предупреждения', async () => {
      const { result } = await hydrate();
      await waitFor(() => expect(result.current.analyzeImport).not.toBeNull());
      // Сервер дописывает пустые поля элемента списка: текст его ответа не равен набранному.
      const normalized = [
        { key: 'home', title: 'Home', interpretation: 'Why', chapters: null, quotes: null },
      ];
      act(() =>
        result.current.setListText(
          'themes',
          '[{"key":"home","title":"Home","interpretation":"Why"}]'
        )
      );
      mocks.mutate.mockImplementation(
        (_v: unknown, opts: { onSuccess: (r: BookAnalysisSaveResponse) => void }) =>
          opts.onSuccess({
            analysis: { ...emptySaved, mainIdea: 'Old idea', themes: normalized, hasCore: true },
            hasCore: true,
            warnings: [],
          } as unknown as BookAnalysisSaveResponse)
      );
      act(() => result.current.handleSave());
      // Правка того же списка после сохранения: сервер его не менял — предупреждать не о чем.
      act(() => result.current.setListText('themes', '[]'));
      mocks.enqueueSnackbar.mockClear();
      mocks.refetch.mockResolvedValue({
        status: 'success',
        data: { ...emptySaved, mainIdea: 'Run idea', themes: normalized, hasCore: true },
        dataUpdatedAt: FRESH,
      });
      await act(() => result.current.reloadBlocks());
      expect(result.current.form.texts.mainIdea).toBe('Run idea');
      expect(result.current.form.drafts.themes.text).toBe('[]');
      expect(mocks.enqueueSnackbar).not.toHaveBeenCalledWith(
        expect.stringContaining('your edits are kept'),
        expect.anything()
      );
    });
  });

  describe('Save во время хода анализа (F07-3a, Б1)', () => {
    const runOf = (status: string, op: string, items: unknown[] = []) => ({
      status,
      operation: { status: op },
      items,
    });
    const regenItem = (regenOperationStatus: string) => ({
      regenerating: true,
      regenOperationStatus,
    });
    const saved = async (isAdmin: boolean) => {
      mocks.analysis = {
        data: { ...emptySaved, mainIdea: 'Saved', hasCore: true },
        isLoading: false,
        isSuccess: true,
        isFetching: false,
        error: null,
      } as typeof mocks.analysis;
      const hook = renderHook(() => useAnalysisTab({ ...props, isAdmin }));
      await waitFor(() => expect(hook.result.current.analyzeImport).not.toBeNull());
      return hook;
    };

    it('ход идёт — «Save analysis» закрыт с пояснением, запись не уходит', async () => {
      mocks.run = runOf('building', 'active');
      const { result } = await saved(true);
      expect(result.current.saveBlockedReason).toBe(
        'The analysis run is writing blocks: save when it ends or pauses.'
      );
      act(() => result.current.handleSave());
      expect(mocks.mutate).not.toHaveBeenCalled();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        'The analysis run is writing blocks: save when it ends or pauses.',
        { variant: 'warning' }
      );
    });

    it.each([
      ['pending', 'The analysis run is loading: save when it loads.'],
      ['error', 'Could not load the analysis run: reload the page before saving.'],
    ] as const)(
      'состояние хода %s — идёт ли запись, неизвестно: «Save analysis» закрыт',
      async (state, reason) => {
        mocks.runState = state;
        const { result } = await saved(true);
        expect(result.current.saveBlockedReason).toBe(reason);
        act(() => result.current.handleSave());
        expect(mocks.mutate).not.toHaveBeenCalled();
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(reason, { variant: 'warning' });
      }
    );

    it('не admin — хода не видит, «Save analysis» открыт', async () => {
      mocks.runState = 'pending';
      const { result } = await saved(false);
      expect(result.current.saveBlockedReason).toBeNull();
    });

    it('перегенерация блока идёт (пустой пишется в анализ сразу) — закрыт; на паузе — открыт', async () => {
      mocks.run = runOf('ready', 'done', [regenItem('active')]);
      const { result, rerender } = await saved(true);
      expect(result.current.saveBlockedReason).toBe(
        'A block of the analysis run is being regenerated: save when it ends.'
      );
      act(() => result.current.handleSave());
      expect(mocks.mutate).not.toHaveBeenCalled();
      mocks.run = runOf('ready', 'done', [regenItem('paused')]);
      rerender();
      expect(result.current.saveBlockedReason).toBeNull();
    });

    it('«Accept», «Accept all» или «Regenerate» в полёте — закрыт; считаются мутации записи этой версии', async () => {
      mocks.run = runOf('ready', 'done');
      mocks.writesInFlight = true;
      const { result, rerender } = await saved(true);
      expect(mocks.writesFor).toContain(props.versionId);
      expect(result.current.saveBlockedReason).toBe(
        'Blocks of the analysis run are being written: save when it ends.'
      );
      act(() => result.current.handleSave());
      expect(mocks.mutate).not.toHaveBeenCalled();
      mocks.writesInFlight = false;
      rerender();
      expect(result.current.saveBlockedReason).toBeNull();
    });

    it('ход на паузе или готов — «Save analysis» открыт', async () => {
      mocks.run = runOf('building', 'paused');
      const { result, rerender } = await saved(true);
      expect(result.current.saveBlockedReason).toBeNull();
      act(() => result.current.handleSave());
      expect(mocks.mutate).toHaveBeenCalledTimes(1);
      mocks.run = runOf('ready', 'done');
      rerender();
      expect(result.current.saveBlockedReason).toBeNull();
    });
  });

  describe('Copy prompt inputs', () => {
    const writeText = vi.fn();
    beforeEach(() => {
      writeText.mockReset();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });
    });

    it('копирует вводные и сообщает об успехе', async () => {
      writeText.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAnalysisTab(props));
      act(() => result.current.copyPromptInputs());
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(writeText.mock.calls[0][0]).toContain('1 — One');
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Prompt inputs copied', {
          variant: 'success',
        })
      );
    });

    const readyDossier = (patch: Partial<DossierStatus> = {}): Partial<DossierStatus> => ({
      status: 'ready',
      sourceVersionId: 'v1',
      data: {
        motifs: [
          { image: 'the door', chapters: [1, 7] },
          { image: 'rain', chapters: [] },
        ],
      } as unknown as DossierStatus['data'],
      ...patch,
    });

    it('не admin — запроса досье нет, мотивов во «Вводных» нет (F07-3a)', () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossier = readyDossier();
      const { result } = renderHook(() => useAnalysisTab(props));
      act(() => result.current.copyPromptInputs());
      expect(mocks.dossierEnabled.length).toBeGreaterThan(0);
      expect(mocks.dossierEnabled.every((e) => !e)).toBe(true);
      expect(writeText.mock.calls[0][0]).not.toContain('мотивы');
    });

    it('admin с готовым досье — мотивы во «Вводных», главы только этой версии; строящееся их не даёт (F07-3a)', () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossier = readyDossier();
      const { result, rerender } = renderHook(() => useAnalysisTab({ ...props, isAdmin: true }));
      act(() => result.current.copyPromptInputs());
      // Глава 7 у версии нет (в списке глав только 1): она снята, как у `motifsOf` бэкенда.
      expect(writeText.mock.calls[0][0]).toContain(
        'Сквозные мотивы из досье:\n- the door — главы 1\n- rain'
      );
      mocks.dossier = readyDossier({ status: 'building' });
      rerender();
      act(() => result.current.copyPromptInputs());
      expect(writeText.mock.calls[1][0]).not.toContain('мотивы');
    });

    it('досье исходника на другом языке — помечено его языком; язык ещё грузится — копировать рано (F07-3a)', async () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossier = readyDossier({ sourceVersionId: 'src' });
      const { result, rerender } = renderHook(() => useAnalysisTab({ ...props, isAdmin: true }));
      act(() => result.current.copyPromptInputs());
      expect(writeText).not.toHaveBeenCalled();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('The dossier motifs are not loaded yet', {
        variant: 'warning',
      });
      mocks.sourceLanguage = 'fr';
      rerender();
      act(() => result.current.copyPromptInputs());
      expect(writeText.mock.calls[0][0]).toContain('Сквозные мотивы из досье (язык досье: fr):');
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Prompt inputs copied', {
          variant: 'success',
        })
      );
    });

    it('досье ещё грузится — копировать рано, редактор знает (F07-3a)', () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossier = null;
      const { result } = renderHook(() => useAnalysisTab({ ...props, isAdmin: true }));
      act(() => result.current.copyPromptInputs());
      expect(writeText).not.toHaveBeenCalled();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('The dossier motifs are not loaded yet', {
        variant: 'warning',
      });
    });

    it('досье или язык его версии не загрузились — копия без мотивов и предупреждение (F07-3a)', async () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossierError = true;
      const { result, rerender } = renderHook(() => useAnalysisTab({ ...props, isAdmin: true }));
      act(() => result.current.copyPromptInputs());
      expect(writeText.mock.calls[0][0]).not.toContain('мотивы');
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
          'Prompt inputs copied without the dossier motifs: could not load the dossier',
          { variant: 'warning' }
        )
      );
      mocks.dossierError = false;
      mocks.dossier = readyDossier({ sourceVersionId: 'src' });
      mocks.sourceError = true;
      rerender();
      act(() => result.current.copyPromptInputs());
      expect(writeText.mock.calls[1][0]).not.toContain('мотивы');
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
          'Prompt inputs copied without the dossier motifs: could not load the language of the dossier',
          { variant: 'warning' }
        )
      );
    });

    it('досье не готово (строится или его нет) — мотивов нет молча', async () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossier = { status: 'missing', sourceVersionId: 'v1', data: null };
      const { result } = renderHook(() => useAnalysisTab({ ...props, isAdmin: true }));
      act(() => result.current.copyPromptInputs());
      expect(writeText.mock.calls[0][0]).not.toContain('мотивы');
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Prompt inputs copied', {
          variant: 'success',
        })
      );
    });

    it('досье устарело (fresh: false) — копия без мотивов и прямо «the dossier is outdated»', async () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossier = readyDossier({ fresh: false });
      const { result } = renderHook(() => useAnalysisTab({ ...props, isAdmin: true }));
      act(() => result.current.copyPromptInputs());
      expect(writeText.mock.calls[0][0]).not.toContain('мотивы');
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
          'Prompt inputs copied without the dossier motifs: the dossier is outdated',
          { variant: 'warning' }
        )
      );
    });

    it('досье готово и свежее, упало только фоновое перечитывание — мотивы берутся', async () => {
      writeText.mockResolvedValue(undefined);
      mocks.dossier = readyDossier({ fresh: true });
      mocks.dossierRefetchError = true;
      const { result } = renderHook(() => useAnalysisTab({ ...props, isAdmin: true }));
      act(() => result.current.copyPromptInputs());
      expect(writeText.mock.calls[0][0]).toContain('Сквозные мотивы из досье:');
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Prompt inputs copied', {
          variant: 'success',
        })
      );
    });

    it('отказ буфера — тост об ошибке', async () => {
      writeText.mockRejectedValue(new Error('denied'));
      const { result } = renderHook(() => useAnalysisTab(props));
      act(() => result.current.copyPromptInputs());
      await waitFor(() =>
        expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Could not copy to clipboard', {
          variant: 'error',
        })
      );
    });

    it('без буфера (не защищённый контекст) — отказ, а не исключение', () => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      const { result } = renderHook(() => useAnalysisTab(props));
      expect(() => act(() => result.current.copyPromptInputs())).not.toThrow();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Could not copy to clipboard', {
        variant: 'error',
      });
    });
  });
});
