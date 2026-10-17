import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAnalysisTab } from '@/components/admin/books/AnalysisTab/useAnalysisTab';
import { ApiError } from '@/types/api';
import type { BookAnalysisSaveResponse } from '@/types/api-schema';

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
    error: unknown;
  },
  loadValidation: null as null | (() => Promise<unknown>),
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/api/hooks', () => ({
  useBookAnalysis: () => mocks.analysis,
  useChapterTitles: () => ({
    data: { items: [{ number: 1, title: 'One' }], pagination: { total: 1 } },
  }),
  useSaveBookAnalysis: () => ({
    mutate: mocks.mutate,
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    // Реализации моков из прошлых тестов снимаются: `clearAllMocks` чистит только историю.
    mocks.mutate.mockReset();
    mocks.mutateAsync.mockReset();
    mocks.analysis = { data: null, isLoading: false, isSuccess: true, error: null };
    mocks.loadValidation = null;
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
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Saved idea', hasCore: true },
      isLoading: false,
      isSuccess: true,
      error: null,
    };
    rerender();
    expect(result.current.form.texts.mainIdea).toBe('Saved idea');
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

  it('устаревший кэш при перечитывании: форма ждёт свежих данных', () => {
    mocks.analysis = {
      data: { ...emptySaved, mainIdea: 'Stale', hasCore: true },
      isLoading: false,
      isSuccess: true,
      isFetching: true,
      error: null,
    } as typeof mocks.analysis;
    const { result, rerender } = renderHook(() => useAnalysisTab(props));
    expect(result.current.form.texts.mainIdea).toBe('');
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
