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
}));

vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: mocks.enqueueSnackbar }) }));

vi.mock('@/api/hooks', () => ({
  useBookSummary: () => ({ data: null, isLoading: false }),
  useUpsertBookSummary: () => ({ mutate: mocks.mutate, isPending: false }),
}));

describe('useSummaryTab: сохранение', () => {
  beforeEach(() => vi.clearAllMocks());

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
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      versionId: 'v1',
      data: { summary: '<p>The ghost appears.</p>' },
    });
  });
});
