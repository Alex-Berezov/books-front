import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { summaryKeys } from '@/api/hooks/useBookSummary';
import { useSummaryTab } from '@/components/admin/books/SummaryTab/useSummaryTab';
import type { BookSummaryDetail } from '@/types/api-schema';

/**
 * F06-3: ход «Write Summary» записал полный или «Очень кратко» — форма берёт с сервера только эти
 * поля из свежего ответа (настоящий QueryClient, запрос в полёте со старыми данными); поле
 * с несохранённой правкой не затирается — текст сервера ждёт «Load the server text»; упавшее
 * перечитывание ничего не меняет и ничего не оставляет ждать.
 */

const api = vi.hoisted(() => ({
  getBookSummary: vi.fn(),
  upsertBookSummary: vi.fn(),
  upsertBookSummaryBrief: vi.fn(),
}));
vi.mock('@/api/endpoints/admin/bookSummaries', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...api,
}));
const snack = vi.hoisted(() => vi.fn());
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: snack }) }));

const summary = (full: string, brief: string): BookSummaryDetail => ({
  id: 's1',
  summary: full,
  hasText: true,
  brief,
  briefHasText: true,
  updatedAt: '2026-11-02T00:00:00.000Z',
});

const OLD = summary('<p>Old full.</p>', '<p>Old brief.</p>');
const NEW = summary('<p>New full.</p>', '<p>New brief.</p>');

describe('useSummaryTab: fields written by the summary run', () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  /** Что отдаёт сервер, когда очередь ответов теста пуста. */
  let server: BookSummaryDetail = OLD;

  const hydrated = async () => {
    api.getBookSummary.mockResolvedValueOnce(OLD);
    const hook = renderHook(({ versionId }) => useSummaryTab({ versionId }), {
      wrapper,
      initialProps: { versionId: 'v1' },
    });
    await waitFor(() => expect(hook.result.current.formData.summaryText).toBe('<p>Old full.</p>'));
    return hook;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    server = OLD;
    api.getBookSummary.mockImplementation(() => Promise.resolve(server));
    api.upsertBookSummary.mockImplementation(() => Promise.resolve(server));
    api.upsertBookSummaryBrief.mockImplementation(() => Promise.resolve(server));
  });

  it('old data with a fetch in flight: the form takes the fresh field, the other field stays', async () => {
    const { result } = await hydrated();
    // Перечитывание уже идёт и отдаст старое; его ответ не должен попасть в форму.
    let staleAnswer: (value: BookSummaryDetail) => void = () => undefined;
    api.getBookSummary.mockImplementationOnce(
      () => new Promise<BookSummaryDetail>((resolve) => (staleAnswer = resolve))
    );
    void client.invalidateQueries({ queryKey: summaryKeys.detail('v1') });
    await waitFor(() => expect(client.isFetching()).toBe(1));
    api.getBookSummary.mockResolvedValueOnce(NEW);
    await act(() => result.current.reloadFields(['full']));
    // Устаревший ответ приходит после свежего: форма его не берёт.
    await act(async () => staleAnswer(OLD));
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
    expect(result.current.formData.briefText).toBe('<p>Old brief.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('an unsaved edit is not overwritten: the server text waits for «Load the server text»', async () => {
    const { result } = await hydrated();
    act(() => result.current.handleFieldChange('briefText', '<p>Mine.</p>'));
    api.getBookSummary.mockResolvedValueOnce(NEW);
    await act(() => result.current.reloadFields(['full', 'brief']));
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
    expect(result.current.formData.briefText).toBe('<p>Mine.</p>');
    expect(result.current.serverUpdates).toEqual({ briefText: '<p>New brief.</p>' });
    act(() => result.current.loadServerText('briefText'));
    expect(result.current.formData.briefText).toBe('<p>New brief.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('a failed reload changes nothing and leaves nothing pending for a later answer', async () => {
    const { result } = await hydrated();
    api.getBookSummary.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.reloadFields(['full']));
    expect(result.current.formData.summaryText).toBe('<p>Old full.</p>');
    // Позже набранный текст и пришедший затем ответ: формы никто не трогает.
    act(() => result.current.handleFieldChange('summaryText', '<p>Typed later.</p>'));
    api.getBookSummary.mockResolvedValueOnce(NEW);
    await act(() => client.refetchQueries({ queryKey: summaryKeys.detail('v1') }));
    expect(result.current.formData.summaryText).toBe('<p>Typed later.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('a failed reload closes Save of the field until a retry learns the server text (F06-5c)', async () => {
    const { result } = await hydrated();
    api.getBookSummary.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.reloadFields(['full']));
    expect(result.current.unknownFields).toEqual(['summaryText']);
    act(() => result.current.handleSave());
    expect(api.upsertBookSummary).not.toHaveBeenCalled();
    // Повтор без названных полей: перечитывает невыясненные, форма берёт текст сервера.
    api.getBookSummary.mockResolvedValueOnce(NEW);
    await act(() => result.current.reloadFields([]));
    expect(result.current.unknownFields).toEqual([]);
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
    act(() => result.current.handleSave());
    await waitFor(() => expect(api.upsertBookSummary).toHaveBeenCalledTimes(1));
  });

  it('two overlapping reloads that fail keep both fields unknown; Save of both stays closed (F06-5c)', async () => {
    const { result } = await hydrated();
    // Оба запроса (второй обрывает первый, оборванный ждёт новый) отказывают.
    api.getBookSummary.mockImplementation(() => Promise.reject(new Error('offline')));
    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    act(() => {
      first = result.current.reloadFields(['full']);
      second = result.current.reloadFields(['brief']);
    });
    await act(() => Promise.all([first, second]).then(() => undefined));
    expect([...result.current.unknownFields].sort()).toEqual(['briefText', 'summaryText']);
    act(() => result.current.handleSave());
    act(() => result.current.handleSaveBrief());
    expect(api.upsertBookSummary).not.toHaveBeenCalled();
    expect(api.upsertBookSummaryBrief).not.toHaveBeenCalled();
  });

  it('a reload cancelled by the neighbour save is retried once: a fresh answer clears the mark, no false «not known» (T174, p.5)', async () => {
    const { result } = await hydrated();
    // Запрос в полёте и не отвечает; сохранение соседнего поля отменяет его с откатом.
    api.getBookSummary.mockImplementationOnce(
      () => new Promise<BookSummaryDetail>(() => undefined)
    );
    server = NEW;
    let reload: Promise<void> = Promise.resolve();
    act(() => {
      reload = result.current.reloadFields(['full']);
    });
    await waitFor(() => expect(client.isFetching()).toBe(1));
    await act(async () => {
      await client.cancelQueries({ queryKey: summaryKeys.detail('v1') });
      await reload;
    });
    expect(result.current.unknownFields).toEqual([]);
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
  });

  it('a reload cancelled and the retry failing too: the field stays unknown (F06-5c)', async () => {
    const { result } = await hydrated();
    api.getBookSummary.mockImplementationOnce(
      () => new Promise<BookSummaryDetail>(() => undefined)
    );
    api.getBookSummary.mockRejectedValueOnce(new Error('offline'));
    let reload: Promise<void> = Promise.resolve();
    act(() => {
      reload = result.current.reloadFields(['full']);
    });
    await waitFor(() => expect(client.isFetching()).toBe(1));
    await act(async () => {
      await client.cancelQueries({ queryKey: summaryKeys.detail('v1') });
      await reload;
    });
    expect(result.current.unknownFields).toEqual(['summaryText']);
    expect(result.current.formData.summaryText).toBe('<p>Old full.</p>');
  });

  it('Save of a field whose server text is not known says so with the label of the notice, and is not sent (T174, p.5)', async () => {
    const { result } = await hydrated();
    api.getBookSummary.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.reloadFields(['full', 'brief']));
    snack.mockClear();
    act(() => result.current.handleSave());
    expect(snack).toHaveBeenCalledTimes(1);
    expect(snack).toHaveBeenCalledWith(
      'The server text of “Summary” is not known: retry loading it first',
      { variant: 'warning' }
    );
    expect(api.upsertBookSummary).not.toHaveBeenCalled();
    snack.mockClear();
    act(() => result.current.handleSaveBrief());
    expect(snack).toHaveBeenCalledTimes(1);
    expect(snack).toHaveBeenCalledWith(
      'The server text of “Very short summary” is not known: retry loading it first',
      { variant: 'warning' }
    );
    expect(api.upsertBookSummaryBrief).not.toHaveBeenCalled();
  });

  it('a failure on version A, away to B and back to A: the fresh fill clears the mark (F06-5c)', async () => {
    const { result, rerender } = await hydrated();
    api.getBookSummary.mockRejectedValueOnce(new Error('offline'));
    await act(() => result.current.reloadFields(['full']));
    expect(result.current.unknownFields).toEqual(['summaryText']);
    api.getBookSummary.mockResolvedValueOnce(summary('<p>B.</p>', '<p>B brief.</p>'));
    rerender({ versionId: 'v2' });
    await waitFor(() => expect(result.current.formData.summaryText).toBe('<p>B.</p>'));
    api.getBookSummary.mockResolvedValueOnce(NEW);
    rerender({ versionId: 'v1' });
    await waitFor(() => expect(result.current.formData.summaryText).toBe('<p>New full.</p>'));
    expect(result.current.unknownFields).toEqual([]);
  });

  it('a version switched inside the mounted tab reads its summary afresh, not from the cache (F06-5c)', async () => {
    const { rerender } = await hydrated();
    client.setQueryData(summaryKeys.detail('v2'), OLD);
    api.getBookSummary.mockClear();
    rerender({ versionId: 'v2' });
    await waitFor(() => expect(api.getBookSummary).toHaveBeenCalledWith('v2'));
  });

  it('an unsaved edit over a field the server did not change: no notice', async () => {
    const { result } = await hydrated();
    act(() => result.current.handleFieldChange('briefText', '<p>Mine.</p>'));
    await act(() => result.current.reloadFields(['brief']));
    expect(result.current.formData.briefText).toBe('<p>Mine.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('Save Summary makes the saved text the known server text: a later run write goes in silently', async () => {
    const { result } = await hydrated();
    act(() => result.current.handleFieldChange('summaryText', '<p>Saved by me.</p>'));
    server = summary('<p>Saved by me.</p>', '<p>Old brief.</p>');
    act(() => result.current.handleSave());
    await waitFor(() => expect(api.upsertBookSummary).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    server = NEW;
    await act(() => result.current.reloadFields(['full']));
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('Save Very Short Summary does the same and clears its notice', async () => {
    const { result } = await hydrated();
    act(() => result.current.handleFieldChange('briefText', '<p>Mine.</p>'));
    server = NEW;
    await act(() => result.current.reloadFields(['brief']));
    expect(result.current.serverUpdates).toEqual({ briefText: '<p>New brief.</p>' });
    server = summary('<p>New full.</p>', '<p>Mine.</p>');
    act(() => result.current.handleSaveBrief());
    await waitFor(() => expect(api.upsertBookSummaryBrief).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.serverUpdates).toEqual({}));
    server = summary('<p>New full.</p>', '<p>Run brief.</p>');
    await act(() => result.current.reloadFields(['brief']));
    expect(result.current.formData.briefText).toBe('<p>Run brief.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('another version: the notice of the previous one is gone and does not load into the form', async () => {
    const { result, rerender } = await hydrated();
    act(() => result.current.handleFieldChange('briefText', '<p>Mine.</p>'));
    server = NEW;
    await act(() => result.current.reloadFields(['brief']));
    expect(result.current.serverUpdates).toEqual({ briefText: '<p>New brief.</p>' });
    server = summary('<p>B full.</p>', '<p>B brief.</p>');
    rerender({ versionId: 'v2' });
    await waitFor(() => expect(result.current.formData.summaryText).toBe('<p>B full.</p>'));
    expect(result.current.serverUpdates).toEqual({});
    act(() => result.current.loadServerText('briefText'));
    expect(result.current.formData.briefText).toBe('<p>B brief.</p>');
  });

  it('Save keeps the text the server stored: spaces around and an empty brief raise no false notice', async () => {
    const { result } = await hydrated();
    act(() => result.current.handleFieldChange('summaryText', '  <p>Spaced.</p>  '));
    server = summary('<p>Spaced.</p>', '<p>Old brief.</p>');
    act(() => result.current.handleSave());
    await waitFor(() => expect(api.upsertBookSummary).toHaveBeenCalledTimes(1));
    expect(api.upsertBookSummary).toHaveBeenCalledWith(
      'v1',
      { summary: '<p>Spaced.</p>' },
      { expectedUpdatedAt: '2026-11-02T00:00:00.000Z' }
    );
    await waitFor(() => expect(client.isMutating()).toBe(0));
    act(() => result.current.handleFieldChange('briefText', '<p></p>'));
    server = { ...summary('<p>Spaced.</p>', ''), brief: null };
    act(() => result.current.handleSaveBrief());
    await waitFor(() => expect(api.upsertBookSummaryBrief).toHaveBeenCalledTimes(1));
    expect(api.upsertBookSummaryBrief).toHaveBeenCalledWith(
      'v1',
      { brief: null },
      '2026-11-02T00:00:00.000Z'
    );
    await waitFor(() => expect(client.isMutating()).toBe(0));
    // Сервер ничего не менял: ни плашки, ни подмены набранного.
    await act(() => result.current.reloadFields(['full', 'brief']));
    expect(result.current.serverUpdates).toEqual({});
    // Ход затем пишет полный: поле без правки берёт его молча.
    server = summary('<p>Run full.</p>', '');
    await act(() => result.current.reloadFields(['full']));
    expect(result.current.formData.summaryText).toBe('<p>Run full.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('Save of markup the server rewrites (sanitizer): an unedited form still takes the run text silently', async () => {
    const { result } = await hydrated();
    // Редактор отдаёт `<br>` и кавычки как есть, санитайзер сервера — `<br />` и `&quot;`.
    act(() => result.current.handleFieldChange('summaryText', '<p>Line<br>"quoted"</p>'));
    act(() => result.current.handleFieldChange('briefText', '<p>Short<br>"one"</p>'));
    server = summary('<p>Line<br />&quot;quoted&quot;</p>', '<p>Old brief.</p>');
    act(() => result.current.handleSave());
    await waitFor(() => expect(api.upsertBookSummary).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    server = summary('<p>Line<br />&quot;quoted&quot;</p>', '<p>Short<br />&quot;one&quot;</p>');
    act(() => result.current.handleSaveBrief());
    await waitFor(() => expect(api.upsertBookSummaryBrief).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    // Accept хода записал оба поля: неправленая после Save форма берёт их без плашки.
    server = NEW;
    await act(() => result.current.reloadFields(['full', 'brief']));
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
    expect(result.current.formData.briefText).toBe('<p>New brief.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('two reloads in a row (Accept full, then Accept brief): both fields take the fresh text', async () => {
    const { result } = await hydrated();
    server = NEW;
    // Второй вызов обрывает запрос первого: первый не должен взять прежний кэш за свежий ответ.
    await act(() =>
      Promise.all([result.current.reloadFields(['full']), result.current.reloadFields(['brief'])])
    );
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
    expect(result.current.formData.briefText).toBe('<p>New brief.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('a Save answer of the previous version does not touch what the form knows of the new one', async () => {
    const { result, rerender } = await hydrated();
    act(() => result.current.handleFieldChange('summaryText', '<p>A typed.</p>'));
    let answerA: (value: BookSummaryDetail) => void = () => undefined;
    api.upsertBookSummary.mockImplementationOnce(
      () => new Promise<BookSummaryDetail>((resolve) => (answerA = resolve))
    );
    act(() => result.current.handleSave());
    await waitFor(() => expect(api.upsertBookSummary).toHaveBeenCalledTimes(1));
    server = summary('<p>B full.</p>', '<p>B brief.</p>');
    rerender({ versionId: 'v2' });
    await waitFor(() => expect(result.current.formData.summaryText).toBe('<p>B full.</p>'));
    await act(async () => answerA(summary('<p>A typed.</p>', '<p>Old brief.</p>')));
    await waitFor(() => expect(client.isMutating()).toBe(0));
    // Ход пишет полный версии B: неправленая форма B берёт его молча.
    server = summary('<p>B run full.</p>', '<p>B brief.</p>');
    await act(() => result.current.reloadFields(['full']));
    expect(result.current.formData.summaryText).toBe('<p>B run full.</p>');
    expect(result.current.serverUpdates).toEqual({});
  });

  it('the form is filled from a fresh answer, not from the cache of another tab', async () => {
    // Кэш свежий по `staleTime`, а ход уже записал полный на сервере.
    client.setQueryData(summaryKeys.detail('v1'), OLD);
    server = NEW;
    const { result } = renderHook(() => useSummaryTab({ versionId: 'v1' }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.formData.summaryText).toBe('<p>New full.</p>');
    expect(api.getBookSummary).toHaveBeenCalledTimes(1);
  });
});
