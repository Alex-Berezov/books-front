import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSummaryTab } from '@/components/admin/books/SummaryTab/useSummaryTab';
import { ApiError } from '@/types/api';

/**
 * Вкладка пересказа в админке (17.10.2026): пустой редактор отдаёт `<p></p>`, и сервер такой
 * пересказ отбивает 400 (`@RichHtmlHasText`). Клиент проверяет то же правило и не шлёт запрос.
 */

const mocks = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
  mutate: vi.fn(),
  mutateBrief: vi.fn(),
  refetch: vi.fn(),
  existing: null as unknown,
  isError: false,
  paused: false,
  refetching: false,
  upsertPending: false,
  briefPending: false,
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/api/hooks', () => ({
  useBookSummary: () => ({
    data: mocks.existing,
    isError: mocks.isError,
    refetch: mocks.refetch,
    status: mocks.isError ? 'error' : mocks.paused ? 'pending' : 'success',
    fetchStatus: mocks.paused ? 'paused' : mocks.refetching ? 'fetching' : 'idle',
  }),
  useUpsertBookSummary: () => ({ mutate: mocks.mutate, isPending: mocks.upsertPending }),
  useUpsertBookSummaryBrief: () => ({
    mutate: mocks.mutateBrief,
    isPending: mocks.briefPending,
  }),
}));

describe('useSummaryTab: сохранение', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mutate.mockReset();
    mocks.mutateBrief.mockReset();
    mocks.refetch.mockReset();
    mocks.existing = null;
    mocks.isError = false;
    mocks.paused = false;
    mocks.refetching = false;
    mocks.upsertPending = false;
    mocks.briefPending = false;
  });

  it.each(['<p></p>', '<p><br></p>', '<p>&nbsp;</p>', '   '])(
    'пересказ без видимого текста %j не уходит на сервер',
    (html) => {
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('summaryText', html));
      act(() => result.current.handleSave());

      expect(mocks.mutate).not.toHaveBeenCalled();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Summary text is required', {
        variant: 'warning',
      });
    }
  );

  describe('сверка записи (LEGACY-496)', () => {
    const changed = () =>
      new ApiError({
        statusCode: 409,
        message: 'changed',
        error: 'Conflict',
        data: { code: 'RECORD_CHANGED' },
      });
    const fresh = (data: unknown) => ({
      status: 'success',
      dataUpdatedAt: Date.now() + 60_000,
      data,
    });

    it('запись уже изменена: предупреждение, форма перечитывает оба поля и точка сверки сдвигается только с показом', async () => {
      mocks.existing = { id: 's1', summary: '<p>Old.</p>', hasText: true, updatedAt: '2026-10-12' };
      mocks.mutate.mockImplementationOnce((_vars, opts: { onError: (e: Error) => void }) =>
        opts.onError(changed())
      );
      mocks.refetch.mockResolvedValue(
        fresh({ id: 's1', summary: '<p>Theirs.</p>', hasText: true, updatedAt: '2026-10-13' })
      );
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('summaryText', '<p>Mine.</p>'));
      await act(async () => result.current.handleSave());

      expect(mocks.refetch).toHaveBeenCalledTimes(1);
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        expect.stringContaining('changed on the server'),
        { variant: 'warning' }
      );
      expect(mocks.enqueueSnackbar).not.toHaveBeenCalledWith(expect.anything(), {
        variant: 'error',
      });
      // Набранное не затёрто, чужой текст показан плашкой.
      expect(result.current.formData.summaryText).toBe('<p>Mine.</p>');
      expect(result.current.serverUpdates.summaryText).toBe('<p>Theirs.</p>');

      act(() => result.current.handleSave());
      expect(mocks.mutate.mock.calls[1]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-13' },
      });
    });

    it('кэш ушёл вперёд без формы: сохранение идёт с точкой сверки формы', () => {
      mocks.existing = { id: 's1', summary: '<p>Old.</p>', hasText: true, updatedAt: '2026-10-12' };
      const { result, rerender } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      mocks.existing = {
        id: 's1',
        summary: '<p>Theirs.</p>',
        hasText: true,
        updatedAt: '2026-10-13',
      };
      rerender();
      act(() => result.current.handleFieldChange('summaryText', '<p>Mine.</p>'));
      act(() => result.current.handleSave());
      expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-12' },
      });
    });

    it('своё сохранение сдвигает точку сверки ответом сервера', () => {
      mocks.existing = { id: 's1', summary: '<p>Old.</p>', hasText: true, updatedAt: '2026-10-12' };
      mocks.mutate.mockImplementationOnce((_vars, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({ summary: '<p>A.</p>', updatedAt: '2026-10-14' })
      );
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('summaryText', '<p>A.</p>'));
      act(() => result.current.handleSave());
      act(() => result.current.handleFieldChange('summaryText', '<p>B.</p>'));
      act(() => result.current.handleSave());
      expect(mocks.mutate.mock.calls[1]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-14' },
      });
    });

    it('перечитывание одного поля при чужой правке другого точку сверки не двигает', async () => {
      mocks.existing = {
        id: 's1',
        summary: '<p>Old.</p>',
        brief: '<p>B.</p>',
        hasText: true,
        updatedAt: '2026-10-12',
      };
      mocks.refetch.mockResolvedValue(
        fresh({
          id: 's1',
          summary: '<p>Theirs.</p>',
          brief: '<p>Run.</p>',
          hasText: true,
          updatedAt: '2026-10-13',
        })
      );
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      await act(async () => result.current.reloadFields(['brief']));
      act(() => result.current.handleFieldChange('summaryText', '<p>Mine.</p>'));
      act(() => result.current.handleSave());
      expect(mocks.mutate.mock.calls[0]![0]).toMatchObject({
        expected: { expectedUpdatedAt: '2026-10-12' },
      });
    });

    it('очень краткий: 409 изменения перечитывает, 409 «нет полного» - обычная ошибка', async () => {
      mocks.existing = { id: 's1', summary: '<p>P.</p>', hasText: true, updatedAt: '2026-10-19' };
      mocks.refetch.mockResolvedValue(fresh(mocks.existing));
      mocks.mutateBrief.mockImplementationOnce((_vars, opts: { onError: (e: Error) => void }) =>
        opts.onError(changed())
      );
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('briefText', '<p>S.</p>'));
      await act(async () => result.current.handleSaveBrief());
      expect(mocks.refetch).toHaveBeenCalledTimes(1);

      mocks.refetch.mockClear();
      mocks.mutateBrief.mockImplementationOnce((_vars, opts: { onError: (e: Error) => void }) =>
        opts.onError(
          new ApiError({
            statusCode: 409,
            message: 'Save the full summary first',
            error: 'Conflict',
          })
        )
      );
      await act(async () => result.current.handleSaveBrief());
      expect(mocks.refetch).not.toHaveBeenCalled();
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Save the full summary first', {
        variant: 'error',
      });
    });

    it('очень краткий: своё сохранение сдвигает точку сверки', () => {
      mocks.existing = { id: 's1', summary: '<p>P.</p>', hasText: true, updatedAt: '2026-10-19' };
      mocks.mutateBrief.mockImplementationOnce((_vars, opts: { onSuccess: (r: unknown) => void }) =>
        opts.onSuccess({ brief: '<p>S.</p>', updatedAt: '2026-10-20' })
      );
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('briefText', '<p>S.</p>'));
      act(() => result.current.handleSaveBrief());
      act(() => result.current.handleSaveBrief());
      expect(mocks.mutateBrief.mock.calls[1]![0]).toMatchObject({
        expectedUpdatedAt: '2026-10-20',
      });
    });

    it('форма заполнена на пустой версии, полный уже есть: очень краткий не уходит без сверки', async () => {
      mocks.existing = null;
      const { result, rerender } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      const theirs = {
        id: 's1',
        summary: '<p>P.</p>',
        brief: '<p>B.</p>',
        hasText: true,
        updatedAt: '2026-10-20',
      };
      mocks.existing = theirs;
      mocks.refetch.mockResolvedValue(fresh(theirs));
      rerender();
      await act(async () => result.current.handleSaveBrief());
      expect(mocks.mutateBrief).not.toHaveBeenCalled();
      expect(mocks.refetch).toHaveBeenCalledTimes(1);
      expect(mocks.enqueueSnackbar).toHaveBeenCalledWith(
        expect.stringContaining('changed on the server'),
        { variant: 'warning' }
      );
    });

    it('показ текста сервера: совпадение с формой в виде хранения плашки не даёт', async () => {
      mocks.existing = {
        id: 's1',
        summary: '<p>P.</p>',
        brief: '<p>B.</p>',
        hasText: true,
        updatedAt: '2026-10-19',
      };
      mocks.refetch.mockResolvedValue(
        fresh({
          id: 's1',
          summary: '<p>P.</p>',
          brief: null,
          hasText: true,
          updatedAt: '2026-10-20',
        })
      );
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('briefText', '<p>Mine.</p>'));
      await act(async () => result.current.reloadFields(['brief']));
      expect(result.current.showsServerText('briefText')).toBe(true);
      act(() => result.current.handleFieldChange('briefText', '<p></p>'));
      expect(result.current.showsServerText('briefText')).toBe(false);
    });

    it('смена версии туда и обратно до ответа: запись без точки сверки не уходит', async () => {
      mocks.existing = { id: 's1', summary: '<p>P.</p>', hasText: true, updatedAt: '2026-10-19' };
      mocks.refetch.mockResolvedValue(fresh(mocks.existing));
      const { result, rerender } = renderHook(({ versionId }) => useSummaryTab({ versionId }), {
        initialProps: { versionId: 'v1' },
      });
      mocks.paused = true;
      rerender({ versionId: 'v2' });
      rerender({ versionId: 'v1' });
      mocks.paused = false;
      rerender({ versionId: 'v1' });
      act(() => result.current.handleFieldChange('summaryText', '<p>Mine.</p>'));
      await act(async () => result.current.handleSave());
      for (const call of mocks.mutate.mock.calls) {
        expect((call[0] as { expected?: unknown }).expected).toBeDefined();
      }
    });

    it('пока идёт запись очень краткого, полный не сохраняется', () => {
      mocks.existing = { id: 's1', summary: '<p>P.</p>', hasText: true, updatedAt: '2026-10-19' };
      mocks.briefPending = true;
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('summaryText', '<p>S.</p>'));
      act(() => result.current.handleSave());
      expect(mocks.mutate).not.toHaveBeenCalled();
    });

    it('пока идёт запись одного поля, второе не сохраняется', () => {
      mocks.existing = { id: 's1', summary: '<p>P.</p>', hasText: true, updatedAt: '2026-10-19' };
      mocks.upsertPending = true;
      const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
      act(() => result.current.handleFieldChange('briefText', '<p>S.</p>'));
      act(() => result.current.handleSaveBrief());
      expect(mocks.mutateBrief).not.toHaveBeenCalled();
    });
  });

  it('пересказ с текстом уходит на сервер', () => {
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    act(() => result.current.handleFieldChange('summaryText', '<p>The ghost appears.</p>'));
    act(() => result.current.handleSave());

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    // Только пересказ: `analysis`/`themes` - поля будущего раздела «Разбор и анализ», форма их
    // не шлёт, и сервер сохранённое в них не трогает.
    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      versionId: 'v1',
      data: { summary: '<p>The ghost appears.</p>' },
      expected: { expectedAbsent: 'true' },
    });
  });

  it('сохранённый пересказ подставляется в поле; analysis и themes не уходят на сервер', () => {
    mocks.existing = {
      id: 's1',
      summary: '<p>Old plot.</p>',
      analysis: '<p>Saved analysis</p>',
      themes: '<p>Saved themes</p>',
      updatedAt: '2026-10-12',
    };
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    // Ответ бэкенда до F04 — без `brief`: поле очень краткого пустое, вкладка не падает.
    expect(result.current.formData).toEqual({ summaryText: '<p>Old plot.</p>', briefText: '' });

    act(() => result.current.handleSave());

    expect(mocks.mutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutate.mock.calls[0][0]).toEqual({
      versionId: 'v1',
      data: { summary: '<p>Old plot.</p>' },
      expected: { expectedUpdatedAt: '2026-10-12' },
    });
  });

  it('перечитанный после сохранения пересказ не затирает набранный текст', () => {
    mocks.existing = { id: 's1', summary: '<p>Saved.</p>', updatedAt: '2026-10-12' };
    const { result, rerender } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    act(() => result.current.handleFieldChange('summaryText', '<p>Saved. And more.</p>'));

    mocks.existing = { id: 's1', summary: '<p>Saved.</p>', updatedAt: '2026-10-13' };
    rerender();

    expect(result.current.formData.summaryText).toBe('<p>Saved. And more.</p>');
  });
});

describe('useSummaryTab: очень краткий пересказ (F04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existing = null;
    mocks.isError = false;
    mocks.paused = false;
    mocks.refetching = false;
  });

  it('без полного пересказа сохранить нельзя: кнопка выключена, запрос не уходит', () => {
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    expect(result.current.hasFullSummary).toBe(false);
    act(() => result.current.handleFieldChange('briefText', '<p>Short.</p>'));
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief).not.toHaveBeenCalled();
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Save the Summary first', {
      variant: 'warning',
    });
  });

  it('сохранённый очень краткий подставляется; время чтения считается по тексту', () => {
    mocks.existing = {
      id: 's1',
      summary: '<p>Plot.</p>',
      hasText: true,
      brief: `<p>${'word '.repeat(460)}</p>`,
      briefHasText: true,
      updatedAt: '2026-10-19',
    };
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    expect(result.current.hasFullSummary).toBe(true);
    expect(result.current.briefMinutes).toBe(2);
  });

  it('уходит своей ручкой; пустой редактор очищает поле (null)', () => {
    mocks.existing = { id: 's1', summary: '<p>Plot.</p>', hasText: true, updatedAt: '2026-10-19' };
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    act(() => result.current.handleFieldChange('briefText', '<p>Short.</p>'));
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief.mock.calls[0][0]).toEqual({
      versionId: 'v1',
      brief: '<p>Short.</p>',
      expectedUpdatedAt: '2026-10-19',
    });
    expect(mocks.mutate).not.toHaveBeenCalled();

    act(() => result.current.handleFieldChange('briefText', '<p></p>'));
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief.mock.calls[1][0]).toEqual({
      versionId: 'v1',
      brief: null,
      expectedUpdatedAt: '2026-10-19',
    });
  });

  it('отказ загрузки пересказа: форма не заполняется, сохранить нельзя; пришедший ответ заполняет', () => {
    mocks.isError = true;
    mocks.existing = undefined;
    const { result, rerender } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    expect(result.current.hasFullSummary).toBe(false);
    expect(result.current.loadFailed).toBe(true);
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief).not.toHaveBeenCalled();

    mocks.isError = false;
    mocks.existing = {
      id: 's1',
      summary: '<p>Plot.</p>',
      hasText: true,
      brief: '<p>Kept.</p>',
      briefHasText: true,
      updatedAt: '2026-10-19',
    };
    rerender();
    expect(result.current.formData.briefText).toBe('<p>Kept.</p>');
    expect(result.current.hasFullSummary).toBe(true);
    expect(result.current.loadFailed).toBe(false);
  });

  it('поздний ответ после ввода текст не затирает: форма заполняется один раз на версию', () => {
    mocks.existing = {
      id: 's1',
      summary: '<p>Plot.</p>',
      hasText: true,
      brief: '<p>Server.</p>',
      briefHasText: true,
      updatedAt: '2026-10-19',
    };
    const { result, rerender } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    expect(result.current.formData.briefText).toBe('<p>Server.</p>');
    act(() => result.current.handleFieldChange('briefText', '<p>Typed.</p>'));

    // Повтор запроса: отказ, затем удачный ответ с другим текстом.
    mocks.isError = true;
    rerender();
    expect(result.current.loadFailed).toBe(false);
    mocks.isError = false;
    mocks.existing = { ...(mocks.existing as object), brief: '<p>Later.</p>' };
    rerender();
    expect(result.current.formData.briefText).toBe('<p>Typed.</p>');
  });

  it('полный пересказ без видимого текста — очень краткий не сохраняется', () => {
    mocks.existing = { id: 's1', summary: '<p></p>', hasText: false, updatedAt: '2026-10-19' };
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    expect(result.current.hasFullSummary).toBe(false);
  });

  it('бриф из одной картинки уходит как есть, пустой редактор — null', () => {
    mocks.existing = { id: 's1', summary: '<p>Plot.</p>', hasText: true, updatedAt: '2026-10-19' };
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    act(() => result.current.handleFieldChange('briefText', '<p><img src="/m/a.jpg"></p>'));
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief.mock.calls[0][0]).toEqual({
      versionId: 'v1',
      brief: '<p><img src="/m/a.jpg"></p>',
      expectedUpdatedAt: '2026-10-19',
    });
    act(() => result.current.handleFieldChange('briefText', '<p><br></p>'));
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief.mock.calls[1][0]).toEqual({
      versionId: 'v1',
      brief: null,
      expectedUpdatedAt: '2026-10-19',
    });
  });

  it('запрос на паузе офлайн: форма не заполняется, сохранения не уходят; ответ после сети заполняет', () => {
    mocks.paused = true;
    mocks.existing = undefined;
    const { result, rerender } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.hasFullSummary).toBe(false);
    act(() => result.current.handleFieldChange('summaryText', '<p>Typed.</p>'));
    act(() => result.current.handleSave());
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutate).not.toHaveBeenCalled();
    expect(mocks.mutateBrief).not.toHaveBeenCalled();

    mocks.paused = false;
    mocks.refetching = false;
    mocks.existing = {
      id: 's1',
      summary: '<p>Plot.</p>',
      hasText: true,
      brief: '<p>Saved brief.</p>',
      briefHasText: true,
      updatedAt: '2026-10-19',
    };
    rerender();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.formData.briefText).toBe('<p>Saved brief.</p>');
  });

  it('устаревший кэш при перечитывании форму не заполняет — заполняет свежий ответ', () => {
    mocks.refetching = true;
    mocks.existing = {
      id: 's1',
      summary: '<p>Plot.</p>',
      hasText: true,
      brief: '<p>Old cached.</p>',
      briefHasText: true,
      updatedAt: '2026-10-19',
    };
    const { result, rerender } = renderHook(() => useSummaryTab({ versionId: 'v1' }));
    expect(result.current.isLoading).toBe(true);
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief).not.toHaveBeenCalled();

    mocks.refetching = false;
    mocks.existing = { ...(mocks.existing as object), brief: '<p>Fresh.</p>' };
    rerender();
    expect(result.current.formData.briefText).toBe('<p>Fresh.</p>');
  });
});
