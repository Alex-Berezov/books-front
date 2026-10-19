import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSummaryTab } from '@/components/admin/books/SummaryTab/useSummaryTab';

/**
 * Вкладка пересказа в админке (17.10.2026): пустой редактор отдаёт `<p></p>`, и сервер такой
 * пересказ отбивает 400 (`@RichHtmlHasText`). Клиент проверяет то же правило и не шлёт запрос.
 */

const mocks = vi.hoisted(() => ({
  enqueueSnackbar: vi.fn(),
  mutate: vi.fn(),
  mutateBrief: vi.fn(),
  existing: null as unknown,
  isError: false,
  paused: false,
  refetching: false,
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/api/hooks', () => ({
  useBookSummary: () => ({
    data: mocks.existing,
    isError: mocks.isError,
    status: mocks.isError ? 'error' : mocks.paused ? 'pending' : 'success',
    fetchStatus: mocks.paused ? 'paused' : mocks.refetching ? 'fetching' : 'idle',
  }),
  useUpsertBookSummary: () => ({ mutate: mocks.mutate, isPending: false }),
  useUpsertBookSummaryBrief: () => ({ mutate: mocks.mutateBrief, isPending: false }),
}));

describe('useSummaryTab: сохранение', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existing = null;
    mocks.isError = false;
    mocks.paused = false;
    mocks.refetching = false;
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
    expect(mocks.enqueueSnackbar).toHaveBeenCalledWith('Save the full summary first', {
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
    expect(mocks.mutateBrief.mock.calls[0][0]).toEqual({ versionId: 'v1', brief: '<p>Short.</p>' });
    expect(mocks.mutate).not.toHaveBeenCalled();

    act(() => result.current.handleFieldChange('briefText', '<p></p>'));
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief.mock.calls[1][0]).toEqual({ versionId: 'v1', brief: null });
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
    });
    act(() => result.current.handleFieldChange('briefText', '<p><br></p>'));
    act(() => result.current.handleSaveBrief());
    expect(mocks.mutateBrief.mock.calls[1][0]).toEqual({ versionId: 'v1', brief: null });
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
