import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { AuthorSearchSelect } from '@/components/admin/authors/AuthorSearchSelect';
import type { Author } from '@/types/api-schema';

/**
 * `LEGACY-352`: выпадающий список авторов брал одну страницу общим потолком
 * (`API_MAX_PAGE_SIZE`) и фильтровал её на клиенте — авторы за первой сотней
 * были невидимы, а отказ запроса выглядел как «в базе никого больше нет».
 * Решение арбитра (`decisions-log.md`, 04.09.2026) — серверный поиск плюс
 * одиночное чтение выбранного автора.
 */

const mocks = vi.hoisted(() => ({
  useAuthors: vi.fn(),
  useAuthor: vi.fn(),
}));

vi.mock('@/api/hooks/useAuthors', () => ({
  useAuthors: mocks.useAuthors,
  useAuthor: mocks.useAuthor,
}));

const authorOf = (overrides: Partial<Author> = {}): Author => ({
  id: 'a-1',
  slug: 'jane-doe',
  translations: [{ language: 'en', slug: 'jane-doe', name: 'Jane Doe' }],
  ...overrides,
});

const EXTRA = [
  { label: '-- Select Existing Author --', value: '' },
  { label: 'Custom / New Author (Enter manually below)', value: 'custom' },
];

const renderSelect = (value?: string, onChange = vi.fn()) =>
  render(
    <AuthorSearchSelect
      id="author-select"
      lang="en"
      value={value}
      extraOptions={EXTRA}
      onChange={onChange}
    />
  );

const searchInput = (container: HTMLElement) =>
  container.querySelector('#author-select') as HTMLInputElement;

describe('AuthorSearchSelect (LEGACY-352)', () => {
  // 🔴 Без этого история вызовов копится по всему файлу, и `toHaveBeenCalledWith('')`
  // читается как «был ли когда-нибудь такой вызов с начала прогона», а не «в этом
  // рендере». Ревью показало мутацией: со снятым гейтом одиночного чтения оба кейса
  // про лишний запрос оставались зелёными.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Таймеры фейковые, как в `authorsToolbar.test.tsx`: на настоящем времени
  // проверка держалась бы на том, что 500 мс успевают пройти внутри `waitFor`.
  it('отдаёт введённый текст серверу как search, а не фильтрует загруженную страницу', () => {
    vi.useFakeTimers();
    mocks.useAuthors.mockReturnValue({ data: { data: [authorOf()] }, isFetching: false });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    const { container } = renderSelect();
    const input = searchInput(container);
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: 'tolstoy' } });

    expect(mocks.useAuthors).not.toHaveBeenCalledWith(
      expect.objectContaining({ search: 'tolstoy' })
    );

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mocks.useAuthors).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'tolstoy' })
    );
  });

  it('резолвит выбранного автора одиночным чтением, когда его нет в выдаче', () => {
    mocks.useAuthors.mockReturnValue({ data: { data: [] }, isFetching: false });
    mocks.useAuthor.mockReturnValue({ data: authorOf({ id: 'outside-page' }) });

    renderSelect('outside-page');

    expect(mocks.useAuthor).toHaveBeenCalledWith('outside-page');
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  // Лишний запрос за тем, что уже на руках: автор в выдаче есть.
  it('не ходит за автором, который уже пришёл в выдаче поиска', () => {
    mocks.useAuthors.mockReturnValue({ data: { data: [authorOf({ id: 'a-1' })] } });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    renderSelect('a-1');

    expect(mocks.useAuthor).toHaveBeenLastCalledWith('');
  });

  // Служебные пункты формы автором не являются и одиночного чтения не вызывают.
  it('не принимает служебный пункт за идентификатор автора', () => {
    mocks.useAuthors.mockReturnValue({ data: { data: [] } });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    renderSelect('custom');

    expect(mocks.useAuthor).toHaveBeenLastCalledWith('');
  });

  // Вторая половина записи: отказ запроса не должен читаться как «нет такого».
  it('отличает отказ поиска от пустой выдачи', () => {
    mocks.useAuthors.mockReturnValue({ data: undefined, isFetching: false, isError: true });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    const { container } = renderSelect();
    fireEvent.mouseDown(searchInput(container));

    expect(screen.getByText(/Search failed/)).toBeInTheDocument();
    expect(screen.queryByText('No authors found')).toBeNull();
  });

  it('показывает «ищем», пока запрос в полёте', () => {
    mocks.useAuthors.mockReturnValue({ data: undefined, isFetching: true, isError: false });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    const { container } = renderSelect();
    fireEvent.mouseDown(searchInput(container));

    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('пустая выдача без отказа — «не найдено»', () => {
    mocks.useAuthors.mockReturnValue({ data: { data: [] }, isFetching: false, isError: false });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    const { container } = renderSelect();
    fireEvent.mouseDown(searchInput(container));

    expect(screen.getByText('No authors found')).toBeInTheDocument();
  });

  // Отказ одиночного чтения: без своей строки в поле остаётся голый uuid,
  // и объяснения нет никакого.
  it('говорит, что выбранного автора не удалось загрузить', () => {
    mocks.useAuthors.mockReturnValue({ data: { data: [] }, isFetching: false, isError: false });
    mocks.useAuthor.mockReturnValue({ data: undefined, isError: true });

    const { container } = renderSelect('outside-page');
    fireEvent.mouseDown(searchInput(container));

    expect(screen.getByText('Could not load the selected author')).toBeInTheDocument();
  });

  // Служебный пункт стоит первой строкой, и при отборе на сервере клиентский
  // фильтр его больше не выбрасывает: с активной первой опцией Enter выбирал бы
  // «-- Select Existing Author --» и стирал уже набранное вручную имя.
  it('не делает служебный пункт активным по умолчанию', () => {
    mocks.useAuthors.mockReturnValue({ data: { data: [authorOf()] }, isFetching: false });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    const { container } = renderSelect();
    fireEvent.mouseDown(searchInput(container));

    expect(container.querySelector('.ant-select-item-option-active')).toBeNull();
  });

  // rc-select чистит свою строку сам, но `onSearch` при этом не зовёт: без
  // сброса следующее открытие списка шло бы со старым `q`, и выдача из одного
  // человека читалась бы как «в базе больше никого нет».
  it('сбрасывает запрос после выбора автора, а не тянет старый q дальше', () => {
    vi.useFakeTimers();
    mocks.useAuthors.mockReturnValue({ data: { data: [authorOf()] }, isFetching: false });
    mocks.useAuthor.mockReturnValue({ data: undefined });

    const onChange = vi.fn();
    const { container } = renderSelect(undefined, onChange);
    const input = searchInput(container);
    fireEvent.mouseDown(input);
    fireEvent.change(input, { target: { value: 'tolstoy' } });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(mocks.useAuthors).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'tolstoy' })
    );

    // Выбор автора — тот же путь, которым ходит редактор.
    fireEvent.click(screen.getByText('Jane Doe'));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onChange).toHaveBeenCalledWith('a-1', expect.objectContaining({ id: 'a-1' }));
    expect(mocks.useAuthors).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: undefined })
    );
  });
});
