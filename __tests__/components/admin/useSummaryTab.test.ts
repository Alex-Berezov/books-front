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
  existing: null as unknown,
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/api/hooks', () => ({
  useBookSummary: () => ({ data: mocks.existing, isLoading: false }),
  useUpsertBookSummary: () => ({ mutate: mocks.mutate, isPending: false }),
}));

describe('useSummaryTab: сохранение', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.existing = null;
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
    expect(result.current.formData).toEqual({ summaryText: '<p>Old plot.</p>' });

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
