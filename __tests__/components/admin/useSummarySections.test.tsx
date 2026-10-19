import type { ComponentProps, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { summaryKeys } from '@/api/hooks';
import { SummarySectionCard } from '@/components/admin/books/SummaryTab/SummarySectionCard';
import { SummarySections } from '@/components/admin/books/SummaryTab/SummarySections';
import {
  STALE_TAB_MESSAGE,
  confirmMessage,
  useSummarySections,
  validateSectionDraft,
} from '@/components/admin/books/SummaryTab/useSummarySections';
import { ApiError } from '@/types/api';
import type {
  BookSummarySectionAdmin,
  BookSummarySectionCreateResponse,
  BookSummarySectionList,
  BookSummarySectionListItem,
  BookSummarySectionUpdateResponse,
  BookSummarySectionWarning,
} from '@/types/api-schema';

/**
 * Разделы пересказа во вкладке Summary (F04-1, `tech.md` §5): раздел адресуется только `id`;
 * удаление и перестановка уходят после подтверждения и несут `from` — порядок вкладки, новый
 * порядок берётся из ответа; 409 и 404 — просьба обновить вкладку и перечитанный список;
 * `warnings` видны сразу после добавления.
 */

const api = vi.hoisted(() => ({
  getBookSummarySections: vi.fn(),
  getBookSummarySection: vi.fn(),
  createBookSummarySection: vi.fn(),
  updateBookSummarySection: vi.fn(),
  deleteBookSummarySection: vi.fn(),
  reorderBookSummarySections: vi.fn(),
  getBookSummary: vi.fn(),
  upsertBookSummary: vi.fn(),
  upsertBookSummaryBrief: vi.fn(),
}));
const snackbar = vi.hoisted(() => vi.fn());

vi.mock('@/api/endpoints/admin/bookSummaries', () => api);
vi.mock('notistack', () => ({ useSnackbar: () => ({ enqueueSnackbar: snackbar }) }));
vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: (props: { id: string; value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid={props.id}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

const item = (id: string, number: number): BookSummarySectionListItem => ({
  id,
  number,
  title: `Part ${number}`,
  readerChapter: null,
  updatedAt: `2026-10-19T10:00:0${number}.000Z`,
});
const list = (...items: BookSummarySectionListItem[]) =>
  ({ sections: items }) satisfies BookSummarySectionList;
const admin = (id: string, number: number) =>
  ({
    ...item(id, number),
    text: '<p>Text</p>',
    contentDate: item(id, number).updatedAt,
  }) satisfies BookSummarySectionAdmin;
const chapterWarning = (message: string) =>
  ({
    code: 'chapter_not_found',
    path: 'readerChapter',
    message,
  }) satisfies BookSummarySectionWarning;

const wrapper = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

const apiError = (statusCode: number) =>
  new ApiError({ statusCode, message: `failed ${statusCode}` });

/** Дать react-query запустить мутацию: `mutationFn` зовётся не синхронно. */
const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

describe('useSummarySections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getBookSummarySections.mockResolvedValue(list(item('a', 1), item('b', 2), item('c', 3)));
  });

  const mount = async () => {
    const hook = renderHook(() => useSummarySections('v1'), { wrapper: wrapper() });
    await waitFor(() => expect(hook.result.current.sections).toHaveLength(3));
    return hook;
  };

  it('удаление без подтверждения не уходит; после подтверждения — один запрос с from вкладки', async () => {
    const { result } = await mount();
    api.deleteBookSummarySection.mockResolvedValue(list(item('a', 1), item('c', 2)));

    act(() => result.current.requestDelete('b'));
    expect(result.current.pendingMessage).toBe(
      confirmMessage({ kind: 'delete', sectionId: 'b', number: 2, isLast: false, from: [] })
    );
    act(() => result.current.cancelPending());
    expect(result.current.pending).toBeNull();
    await flush();
    expect(api.deleteBookSummarySection).not.toHaveBeenCalled();

    act(() => result.current.requestDelete('b'));
    await act(() => result.current.confirmPending());
    expect(api.deleteBookSummarySection).toHaveBeenCalledTimes(1);
    expect(api.deleteBookSummarySection).toHaveBeenCalledWith('v1', {
      sectionId: 'b',
      from: ['a', 'b', 'c'],
    });
  });

  it('удаление, затем перестановка без перезагрузки: from второго — из ответа первого', async () => {
    const { result } = await mount();
    api.deleteBookSummarySection.mockResolvedValue(list(item('a', 1), item('c', 2)));
    api.reorderBookSummarySections.mockResolvedValue(list(item('c', 1), item('a', 2)));

    act(() => result.current.requestDelete('b'));
    await act(() => result.current.confirmPending());
    await waitFor(() => expect(result.current.sections.map((s) => s.id)).toEqual(['a', 'c']));

    act(() => result.current.requestMove('c', -1));
    await flush();
    expect(api.reorderBookSummarySections).not.toHaveBeenCalled();
    await act(() => result.current.confirmPending());
    expect(api.reorderBookSummarySections).toHaveBeenCalledTimes(1);
    expect(api.reorderBookSummarySections).toHaveBeenCalledWith('v1', {
      from: ['a', 'c'],
      to: ['c', 'a'],
    });
  });

  it('тексты подтверждений: удаление последнего — свой, перестановка — свой', async () => {
    const { result } = await mount();
    act(() => result.current.requestDelete('c'));
    expect(result.current.pendingMessage).toBe('Delete section 3? Its address will stop working.');
    act(() => result.current.requestMove('a', 1));
    expect(result.current.pendingMessage).toMatch(/^Move section\?/);
    // Первый вверх и последний вниз не двигаются.
    act(() => result.current.cancelPending());
    act(() => result.current.requestMove('a', -1));
    expect(result.current.pending).toBeNull();
  });

  it.each([409, 404])(
    'отказ %i у перестановки и правки — просьба обновить вкладку и перечитанный список',
    async (statusCode) => {
      const { result } = await mount();
      expect(api.getBookSummarySections).toHaveBeenCalledTimes(1);
      api.reorderBookSummarySections.mockRejectedValue(apiError(statusCode));
      act(() => result.current.requestMove('a', 1));
      await act(() => result.current.confirmPending());
      expect(snackbar).toHaveBeenCalledWith(STALE_TAB_MESSAGE, { variant: 'error' });
      await waitFor(() => expect(api.getBookSummarySections).toHaveBeenCalledTimes(2));

      api.updateBookSummarySection.mockRejectedValue(apiError(statusCode));
      let res: unknown;
      await act(async () => {
        res = await result.current.saveSection(
          'a',
          { title: 'T', text: '<p>x</p>', readerChapter: '' },
          '2026-10-19T10:00:01.000Z'
        );
      });
      expect(res).toEqual({ error: STALE_TAB_MESSAGE, stale: true });
    }
  );

  it.each([409, 404])('отказ %i у удаления — просьба обновить вкладку', async (statusCode) => {
    const { result } = await mount();
    api.deleteBookSummarySection.mockRejectedValue(apiError(statusCode));
    act(() => result.current.requestDelete('a'));
    await act(() => result.current.confirmPending());
    expect(snackbar).toHaveBeenCalledTimes(1);
    expect(snackbar).toHaveBeenCalledWith(STALE_TAB_MESSAGE, { variant: 'error' });
  });

  it('ошибка добавления — у формы (404 — текст сервера, не «обновите вкладку»), без тоста', async () => {
    const { result } = await mount();
    api.createBookSummarySection.mockRejectedValueOnce(apiError(404));
    let res: unknown;
    await act(async () => {
      res = await result.current.addSection({ title: 'T', text: '<p>x</p>', readerChapter: '' });
    });
    expect(res).toBe('failed 404');
    expect(snackbar).not.toHaveBeenCalled();

    api.createBookSummarySection.mockRejectedValueOnce(apiError(500));
    await act(async () => {
      res = await result.current.addSection({ title: 'T', text: '<p>x</p>', readerChapter: '' });
    });
    // 5xx показывает общий тост `MutationCache`; у формы — текст ошибки.
    expect(res).toBe('failed 500');
    expect(snackbar).not.toHaveBeenCalled();
  });

  it('список сменился между запросом и подтверждением — уходит from, который видел редактор', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    api.reorderBookSummarySections.mockRejectedValue(apiError(409));
    const { result } = renderHook(() => useSummarySections('v1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.sections).toHaveLength(3));
    act(() => result.current.requestMove('c', -1));
    // Список перечитан между запросом и подтверждением (например, пришёл ответ добавления).
    act(() => {
      client.setQueryData(
        summaryKeys.sections('v1'),
        list(item('a', 1), item('b', 2), item('c', 3), item('d', 4))
      );
    });
    await waitFor(() => expect(result.current.sections).toHaveLength(4));
    await act(() => result.current.confirmPending());
    expect(api.reorderBookSummarySections).toHaveBeenCalledTimes(1);
    expect(api.reorderBookSummarySections).toHaveBeenCalledWith('v1', {
      from: ['a', 'b', 'c'],
      to: ['a', 'c', 'b'],
    });
    expect(snackbar).toHaveBeenCalledWith(STALE_TAB_MESSAGE, { variant: 'error' });
  });

  it('пока идёт добавление, удаление и перестановка заблокированы', async () => {
    const { result } = await mount();
    let finish: (value: unknown) => void = () => undefined;
    api.createBookSummarySection.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    let adding: Promise<unknown> = Promise.resolve();
    act(() => {
      adding = result.current.addSection({ title: 'T', text: '<p>x</p>', readerChapter: '' });
    });
    await waitFor(() => expect(result.current.isChangingOrder).toBe(true));
    await act(async () => {
      finish({
        section: admin('d', 4),
        sections: [item('a', 1), item('b', 2), item('c', 3), item('d', 4)],
        warnings: [],
      } satisfies BookSummarySectionCreateResponse);
      await adding;
    });
    await waitFor(() => expect(result.current.isChangingOrder).toBe(false));
  });

  it('404 у сохранения — список не перечитывается, карточка с набранным текстом остаётся', async () => {
    const { result } = await mount();
    expect(api.getBookSummarySections).toHaveBeenCalledTimes(1);
    api.updateBookSummarySection.mockRejectedValue(apiError(404));
    let res: unknown;
    await act(async () => {
      res = await result.current.saveSection(
        'a',
        { title: 'T', text: '<p>x</p>', readerChapter: '' },
        '2026-10-19T10:00:01.000Z'
      );
    });
    expect(res).toEqual({ error: STALE_TAB_MESSAGE, stale: true });
    await flush();
    expect(api.getBookSummarySections).toHaveBeenCalledTimes(1);
    expect(result.current.sections.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('два сохранения подряд: второе — с updatedAt из ответа первого', async () => {
    const { result } = await mount();
    const res = (updatedAt: string) =>
      ({
        section: { ...admin('a', 1), updatedAt },
        warnings: [],
      }) satisfies BookSummarySectionUpdateResponse;
    api.updateBookSummarySection
      .mockResolvedValueOnce(res('2026-10-19T11:00:00.000Z'))
      .mockResolvedValueOnce(res('2026-10-19T12:00:00.000Z'));
    const draft = { title: 'T', text: '<p>x</p>', readerChapter: '' };
    let first: unknown;
    await act(async () => {
      first = await result.current.saveSection('a', draft, '2026-10-19T10:00:01.000Z');
    });
    expect(first).toEqual({ updatedAt: '2026-10-19T11:00:00.000Z' });
    await act(async () => {
      await result.current.saveSection('a', draft, '2026-10-19T11:00:00.000Z');
    });
    expect(api.updateBookSummarySection).toHaveBeenCalledTimes(2);
    expect(api.updateBookSummarySection.mock.calls[1]).toEqual([
      'a',
      {
        title: 'T',
        text: '<p>x</p>',
        readerChapter: null,
        expectedUpdatedAt: '2026-10-19T11:00:00.000Z',
      },
    ]);
  });

  it('проверка черновика: пустые поля, длина и теги заголовка, глава вне 1…10000', () => {
    const ok = { title: 'T', text: '<p>x</p>', readerChapter: '' };
    expect(validateSectionDraft({ ...ok, title: '  ' })).toEqual({ error: 'Title is required' });
    expect(validateSectionDraft({ ...ok, text: '<p></p>' })).toEqual({
      error: 'Section text is required',
    });
    expect(validateSectionDraft({ ...ok, title: 'x'.repeat(201) })).toHaveProperty('error');
    expect(validateSectionDraft({ ...ok, title: '<b>T</b>' })).toHaveProperty('error');
    for (const readerChapter of ['0', '10001', '1.5']) {
      expect(validateSectionDraft({ ...ok, readerChapter })).toHaveProperty('error');
    }
    expect(validateSectionDraft({ ...ok, title: ' T ', readerChapter: '7' })).toEqual({
      data: { title: 'T', text: '<p>x</p>', readerChapter: 7 },
    });
  });

  it('добавление с несуществующей главой: предупреждение у формы и тостом-предупреждением', async () => {
    const { result } = await mount();
    const warning = chapterWarning('no chapter 7');
    api.createBookSummarySection.mockResolvedValue({
      section: admin('d', 4),
      sections: [item('a', 1), item('b', 2), item('c', 3), item('d', 4)],
      warnings: [warning],
    } satisfies BookSummarySectionCreateResponse);
    let res: unknown;
    await act(async () => {
      res = await result.current.addSection({
        title: 'Part 4',
        text: '<p>x</p>',
        readerChapter: '7',
      });
    });
    expect(res).toBe(true);
    expect(api.createBookSummarySection).toHaveBeenCalledTimes(1);
    expect(api.createBookSummarySection).toHaveBeenCalledWith('v1', {
      title: 'Part 4',
      text: '<p>x</p>',
      readerChapter: 7,
    });
    expect(result.current.addWarnings).toEqual([warning]);
    expect(result.current.warnings.d).toEqual([warning]);
    expect(snackbar).toHaveBeenCalledWith('Section 4 added. no chapter 7', { variant: 'warning' });
  });
});

describe('SummarySections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getBookSummarySections.mockResolvedValue(list(item('a', 1), item('b', 2)));
  });

  const renderTab = () => {
    const Wrapper = wrapper();
    render(
      <Wrapper>
        <SummarySections versionId="v1" />
      </Wrapper>
    );
  };

  it('«Delete» открывает подтверждение; запрос уходит только после «Delete» в диалоге', async () => {
    api.deleteBookSummarySection.mockResolvedValue(list(item('b', 1)));
    renderTab();
    await screen.findByRole('button', { name: '1. Part 1' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    expect(
      await screen.findByText(
        confirmMessage({ kind: 'delete', sectionId: 'a', number: 1, isLast: false, from: [] })
      )
    ).toBeInTheDocument();
    await flush();
    expect(api.deleteBookSummarySection).not.toHaveBeenCalled();

    const dialogButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(dialogButtons[dialogButtons.length - 1]);
    await waitFor(() => expect(api.deleteBookSummarySection).toHaveBeenCalledTimes(1));
    expect(api.deleteBookSummarySection).toHaveBeenCalledWith('v1', {
      sectionId: 'a',
      from: ['a', 'b'],
    });
  });

  it('предупреждение после добавления видно у формы', async () => {
    api.createBookSummarySection.mockResolvedValue({
      section: admin('c', 3),
      sections: [item('a', 1), item('b', 2), item('c', 3)],
      warnings: [chapterWarning('chapter 40 is not in this version')],
    } satisfies BookSummarySectionCreateResponse);
    renderTab();
    await screen.findByRole('button', { name: '1. Part 1' });
    fireEvent.change(screen.getByLabelText('New section title'), { target: { value: 'Part 3' } });
    fireEvent.change(screen.getByTestId('summary-section-new-text'), {
      target: { value: '<p>x</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add section' }));
    // У формы добавления (и у новой свёрнутой карточки).
    const shown = await screen.findAllByText('chapter 40 is not in this version');
    expect(shown.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Add section' }).parentElement).toHaveTextContent(
      'chapter 40 is not in this version'
    );
  });

  it('отказ загрузки списка — текст ошибки, а не пустой список', async () => {
    api.getBookSummarySections.mockRejectedValue(apiError(500));
    renderTab();
    expect(await screen.findByRole('alert')).toHaveTextContent('failed 500');
  });
});

describe('SummarySectionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getBookSummarySection.mockResolvedValue(admin('a', 1));
  });

  const renderCard = (onSave: ComponentProps<typeof SummarySectionCard>['onSave']) => {
    const Wrapper = wrapper();
    render(
      <Wrapper>
        <SummarySectionCard
          section={item('a', 1)}
          isFirst
          isLast={false}
          orderLocked={false}
          warnings={[chapterWarning('no chapter 9')]}
          onSave={onSave}
          onDelete={vi.fn()}
          onMove={vi.fn()}
        />
      </Wrapper>
    );
  };

  it('сохранение уходит по id с updatedAt раздела, второе — с updatedAt из ответа первого', async () => {
    const onSave = vi
      .fn()
      .mockResolvedValueOnce({ updatedAt: '2026-10-19T11:00:00.000Z' })
      .mockResolvedValueOnce({ updatedAt: '2026-10-19T12:00:00.000Z' });
    renderCard(onSave);
    // Предупреждение видно и у свёрнутой карточки.
    expect(screen.getByText('no chapter 9')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1. Part 1' }));
    expect(api.getBookSummarySection).toHaveBeenCalledTimes(1);
    expect(api.getBookSummarySection).toHaveBeenCalledWith('a');
    await screen.findByDisplayValue('Part 1');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toBe('a');
    expect(onSave.mock.calls[0][2]).toBe('2026-10-19T10:00:01.000Z');

    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave.mock.calls[1][2]).toBe('2026-10-19T11:00:00.000Z');
  });

  it('раздел не загрузился (404) — просьба обновить вкладку, а не вечный спиннер', async () => {
    api.getBookSummarySection.mockRejectedValue(apiError(404));
    renderCard(vi.fn());
    fireEvent.click(screen.getByRole('button', { name: '1. Part 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(STALE_TAB_MESSAGE);
  });

  it('повторное раскрытие: свежий раздел заменяет нетронутый черновик, набранное — нет', async () => {
    const onSave = vi.fn().mockResolvedValue({ updatedAt: '2026-10-19T13:00:00.000Z' });
    renderCard(onSave);
    const toggle = screen.getByRole('button', { name: '1. Part 1' });
    fireEvent.click(toggle);
    await screen.findByDisplayValue('Part 1');
    fireEvent.click(toggle);

    // Другой редактор поправил раздел, пока карточка была свёрнута.
    api.getBookSummarySection.mockResolvedValue({
      ...admin('a', 1),
      title: 'Theirs',
      updatedAt: '2026-10-19T12:00:00.000Z',
    });
    fireEvent.click(toggle);
    expect(await screen.findByDisplayValue('Theirs')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][2]).toBe('2026-10-19T12:00:00.000Z');

    // Набранное не затирается следующим перечитыванием.
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });
    fireEvent.click(toggle);
    api.getBookSummarySection.mockResolvedValue({
      ...admin('a', 1),
      title: 'Later',
      updatedAt: '2026-10-19T14:00:00.000Z',
    });
    fireEvent.click(toggle);
    await waitFor(() => expect(api.getBookSummarySection).toHaveBeenCalledTimes(3));
    expect(screen.getByDisplayValue('Mine')).toBeInTheDocument();
  });

  it('дописанное во время сохранения остаётся несохранённым и не затирается перечитыванием', async () => {
    let finish: (value: { updatedAt: string }) => void = () => undefined;
    const onSave = vi.fn().mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderCard(onSave);
    const toggle = screen.getByRole('button', { name: '1. Part 1' });
    fireEvent.click(toggle);
    await screen.findByDisplayValue('Part 1');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    // Редактор дописывает, пока запрос в пути.
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Typed later' } });
    await act(async () => {
      finish({ updatedAt: '2026-10-19T11:00:00.000Z' });
    });

    // Другой редактор поправил раздел; карточку свернули и раскрыли.
    fireEvent.click(toggle);
    api.getBookSummarySection.mockResolvedValue({
      ...admin('a', 1),
      title: 'Theirs',
      updatedAt: '2026-10-19T12:00:00.000Z',
    });
    fireEvent.click(toggle);
    await waitFor(() => expect(api.getBookSummarySection).toHaveBeenCalledTimes(2));
    // Дать ответу перечитывания дойти до карточки.
    await flush();
    expect(screen.getByDisplayValue('Typed later')).toBeInTheDocument();
  });

  it('раздел удалён (404): «Reload section» не подставляет старый текст, черновик и ошибка остаются', async () => {
    const onSave = vi.fn().mockResolvedValue({ error: STALE_TAB_MESSAGE, stale: true });
    renderCard(onSave);
    fireEvent.click(screen.getByRole('button', { name: '1. Part 1' }));
    await screen.findByDisplayValue('Part 1');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('button', { name: 'Reload section' });

    api.getBookSummarySection.mockRejectedValue(apiError(404));
    fireEvent.click(screen.getByRole('button', { name: 'Reload section' }));
    await waitFor(() => expect(api.getBookSummarySection).toHaveBeenCalledTimes(2));
    await flush();
    expect(screen.getByDisplayValue('Mine')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(STALE_TAB_MESSAGE);
    expect(screen.getByRole('button', { name: 'Reload section' })).toBeInTheDocument();
  });

  it('устаревшая вкладка при сохранении — «Reload section» берёт раздел с сервера заново', async () => {
    const onSave = vi.fn().mockResolvedValue({ error: STALE_TAB_MESSAGE, stale: true });
    renderCard(onSave);
    fireEvent.click(screen.getByRole('button', { name: '1. Part 1' }));
    await screen.findByDisplayValue('Part 1');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Mine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(STALE_TAB_MESSAGE);

    api.getBookSummarySection.mockResolvedValue({ ...admin('a', 1), title: 'Theirs' });
    fireEvent.click(screen.getByRole('button', { name: 'Reload section' }));
    expect(await screen.findByDisplayValue('Theirs')).toBeInTheDocument();
  });
});
