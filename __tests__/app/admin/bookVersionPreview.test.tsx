import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EditBookVersionPage from '@/app/admin/[lang]/books/versions/[id]/page';
import { BookVersionPreviewClient } from '@/app/admin/[lang]/books/versions/[id]/preview/BookVersionPreviewClient';
import BookVersionPreviewPage from '@/app/admin/[lang]/books/versions/[id]/preview/page';
import { ApiError } from '@/types/api';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/ru/books/versions/v1/preview',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push }),
}));

const versionResult = {
  data: undefined as unknown,
  isLoading: false,
  error: null as unknown,
};

const chaptersResult = {
  data: undefined as unknown,
  isLoading: false,
  error: null as unknown,
};

const useBookVersionSpy = vi.fn();

vi.mock('@/api/hooks', () => ({
  useBookVersion: (...args: unknown[]) => {
    useBookVersionSpy(...args);
    return versionResult;
  },
  useChapters: () => chaptersResult,
}));

// The edit page: its data hook and the heavy panels are stubbed, the header with
// the Preview button is rendered for real.
const editedVersion = { type: 'text' };

vi.mock('@/app/admin/[lang]/books/versions/[id]/useBookVersionLogic', () => ({
  useBookVersionLogic: () => ({
    version: {
      id: 'version-42',
      bookId: 'b1',
      title: 'Гамлет',
      author: 'Шекспир',
      language: 'es',
      status: 'draft',
      type: editedVersion.type,
      categories: [],
      tags: [],
    },
    error: null,
    isLoading: false,
    activeTab: 'overview',
    setActiveTab: vi.fn(),
    isSubmitting: false,
    publishBlockedReason: null,
    handleSubmit: vi.fn(),
    handlePublishSuccess: vi.fn(),
    handleUnpublishSuccess: vi.fn(),
    handleCategoriesChange: vi.fn(),
    handleTagsChange: vi.fn(),
    handleImportJson: vi.fn(),
    isImporting: false,
    router: { push },
  }),
}));

vi.mock('@/components/admin/books', () => {
  const Stub = () => null;
  return {
    BookForm: Stub,
    BookVersionSwitcher: Stub,
    BookVersionTabs: Stub,
    CategoriesPanel: Stub,
    ListenContentTab: Stub,
    PublishPanel: Stub,
    ReadContentTab: Stub,
    RightsContentHashPanel: Stub,
    RightsOverridePanel: Stub,
    RightsTab: Stub,
    SummaryTab: Stub,
    TagsPanel: Stub,
    ImportModal: Stub,
  };
});

const chapter = (id: string, number: number, title: string, content: string) => ({
  id,
  bookVersionId: 'v1',
  number,
  title,
  content,
  createdAt: '2026-10-07T00:00:00Z',
});

const draftChapters = {
  items: [
    chapter(
      'c1',
      1,
      'Акт первый',
      '<p>Быть или не быть</p><img src="https://cdn.example.com/a.png" alt="Эльсинор">'
    ),
    chapter('c2', 2, 'Акт второй', '<p><strong>Вот в чём вопрос</strong></p>'),
  ],
};

const DRAFT_NOTICE =
  'Предпросмотр черновика: читатели увидят этот текст только после публикации версии.';
const LOAD_ERROR = 'Failed to load the book for preview. Try again later.';
const SERVER_ERROR = 'Internal server error. Please try again later';
const NO_CHAPTERS = 'Для этой версии книги нет доступных глав.';

const findHeading = (name: string) => screen.findByRole('heading', { level: 1, name });
const heading = (name: string) => screen.getByRole('heading', { level: 1, name });

/**
 * Before this the Preview button on the version edit page had no handler, and
 * the only way to see how a chapter's formatting and images render for a reader
 * was to publish the book. The preview shows the draft's chapters through the
 * public reader's own view, from the admin route that answers for any status.
 */
describe('Предпросмотр текста черновика', () => {
  // Закрылась ли вкладка по `window.close()`: браузер вправе отказать.
  let tabClosed = false;
  const close = vi.fn(() => {
    tabClosed = true;
  });

  beforeEach(() => {
    push.mockClear();
    close.mockClear();
    useBookVersionSpy.mockClear();
    vi.stubGlobal('close', close);
    tabClosed = false;
    Object.defineProperty(window, 'closed', { configurable: true, get: () => tabClosed });
    versionResult.data = { id: 'v1', title: 'Гамлет', status: 'draft' };
    versionResult.isLoading = false;
    versionResult.error = null;
    chaptersResult.data = draftChapters;
    chaptersResult.isLoading = false;
    chaptersResult.error = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'closed');
  });

  it('рисует главу черновика с форматированием и картинкой и плашку «черновик»', async () => {
    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(await findHeading('Акт первый')).toBeInTheDocument();
    expect(screen.getByText('Быть или не быть')).toBeInTheDocument();
    expect(screen.getByAltText('Эльсинор')).toHaveAttribute('src', 'https://cdn.example.com/a.png');
    expect(screen.getByRole('status')).toHaveTextContent(DRAFT_NOTICE);
    expect(screen.getByText('Гамлет')).toBeInTheDocument();
  });

  it('у опубликованной версии плашки «черновик» нет', async () => {
    versionResult.data = { id: 'v1', title: 'Гамлет', status: 'published' };

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(await findHeading('Акт первый')).toBeInTheDocument();
    expect(screen.queryByText(DRAFT_NOTICE)).not.toBeInTheDocument();
  });

  it('листает главы вперёд, как читалка', async () => {
    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    fireEvent.click(await screen.findByRole('button', { name: 'Следующая глава' }));

    expect(heading('Акт второй')).toBeInTheDocument();
    expect(screen.getByText('Вот в чём вопрос').tagName).toBe('STRONG');
  });

  it('глава, вставленная перед текущей, не подменяет текст на экране', async () => {
    const { rerender } = render(
      <BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Следующая глава' }));

    chaptersResult.data = {
      items: [chapter('c0', 1, 'Пролог', '<p>Пролог</p>'), ...draftChapters.items],
    };
    rerender(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(heading('Акт второй')).toBeInTheDocument();
    expect(screen.getByText('Глава 3 из 3')).toBeInTheDocument();
  });

  it('глава, удалённая в редакторе, не оставляет предпросмотр на пустом месте', async () => {
    const { rerender } = render(
      <BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Следующая глава' }));

    chaptersResult.data = { items: [draftChapters.items[0]] };
    rerender(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(heading('Акт первый')).toBeInTheDocument();
    expect(screen.getByText('Глава 1 из 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Следующая глава' })).toBeDisabled();
  });

  it('пока грузится, виден спиннер, а не читалка и не «нет глав»', () => {
    chaptersResult.data = undefined;
    chaptersResult.isLoading = true;

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByText(NO_CHAPTERS)).not.toBeInTheDocument();
  });

  it('запрос, вставший на паузу без сети, - тоже загрузка, а не «нет глав»', () => {
    // React Query v5: paused-запрос не isLoading и не error, данных нет.
    chaptersResult.data = undefined;
    chaptersResult.isLoading = false;

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText(NO_CHAPTERS)).not.toBeInTheDocument();
    expect(document.body.dataset.immersive).toBeUndefined();
  });

  it('первая глава держится до любого клика: вставка пролога не подменяет текст', async () => {
    const { rerender } = render(
      <BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />
    );
    await findHeading('Акт первый');

    chaptersResult.data = {
      items: [chapter('c0', 1, 'Пролог', '<p>Пролог</p>'), ...draftChapters.items],
    };
    rerender(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(heading('Акт первый')).toBeInTheDocument();
    expect(screen.getByText('Глава 2 из 3')).toBeInTheDocument();
  });

  it('версия без глав показывает «нет глав», а не ошибку', async () => {
    chaptersResult.data = { items: [] };

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(await screen.findByText(NO_CHAPTERS)).toBeInTheDocument();
    expect(screen.queryByText(LOAD_ERROR)).not.toBeInTheDocument();
  });

  it('отказ первой загрузки глав показывает ошибку и путь назад в редактор', () => {
    chaptersResult.data = undefined;
    chaptersResult.error = new Error('Network down');

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor={false} />);

    expect(screen.getByText(LOAD_ERROR)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Edit Version' }));
    expect(push).toHaveBeenCalledWith('/admin/ru/books/versions/v1');
  });

  it('отказ загрузки версии - тоже ошибка, а не читалка без названия', () => {
    versionResult.data = undefined;
    versionResult.error = new ApiError({ message: 'Internal error', statusCode: 500 });

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(screen.getByText(SERVER_ERROR)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    // На экране ошибки прокрутка страницы не блокируется: текст и кнопка могут не влезть.
    expect(document.body.dataset.immersive).toBeUndefined();
  });

  it('403 на главы (юрист) объясняет, что доступа к тексту нет', () => {
    chaptersResult.data = undefined;
    chaptersResult.error = new ApiError({ message: 'Forbidden', statusCode: 403 });

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(screen.getByText('Access denied. Insufficient permissions')).toBeInTheDocument();
  });

  it('отказ перезапроса не выбрасывает из уже показанного текста', async () => {
    chaptersResult.error = new Error('Network down');

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(await screen.findByText('Быть или не быть')).toBeInTheDocument();
  });

  it('стрелка «назад» закрывает вкладку, открытую редактором, а не грузит в ней второй редактор', async () => {
    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    fireEvent.click(await screen.findByRole('button', { name: 'Назад' }));

    expect(close).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('если браузер не дал закрыть вкладку, «назад» ведёт в редактор', async () => {
    close.mockImplementationOnce(() => undefined);
    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    fireEvent.click(await screen.findByRole('button', { name: 'Назад' }));

    expect(close).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/admin/ru/books/versions/v1');
  });

  it('предпросмотр по вставленной ссылке «назад» ведёт в редактор, а не закрывает вкладку', async () => {
    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor={false} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Назад' }));

    expect(close).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/admin/ru/books/versions/v1');
  });

  it('версию перечитывает при возврате на вкладку: публикация в редакторе снимает плашку', () => {
    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(useBookVersionSpy).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({ staleTime: 0, refetchOnWindowFocus: true })
    );
  });

  it('страница блокирует прокрутку под читалкой и отпускает её при уходе', async () => {
    const { unmount } = render(
      <BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />
    );
    await findHeading('Акт первый');

    expect(document.body.dataset.immersive).toBe('true');

    unmount();

    expect(document.body.dataset.immersive).toBeUndefined();
  });

  it('после удаления текущей главы предпросмотр держится за показанную соседнюю', async () => {
    const three = {
      items: [...draftChapters.items, chapter('c3', 3, 'Акт третий', '<p>Третий</p>')],
    };
    chaptersResult.data = three;
    const { rerender } = render(
      <BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Следующая глава' }));
    expect(heading('Акт второй')).toBeInTheDocument();

    // Удалили «Акт второй» - на его месте «Акт третий».
    chaptersResult.data = { items: [three.items[0], three.items[2]] };
    rerender(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);
    expect(heading('Акт третий')).toBeInTheDocument();

    // Потом вставили главу в начало - на экране остаётся «Акт третий».
    chaptersResult.data = {
      items: [chapter('c0', 1, 'Пролог', '<p>Пролог</p>'), three.items[0], three.items[2]],
    };
    rerender(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);
    expect(heading('Акт третий')).toBeInTheDocument();
  });

  it('удаление главы после вставок перед ней ведёт к её соседу, а не на старый номер', async () => {
    const three = {
      items: [...draftChapters.items, chapter('c3', 3, 'Акт третий', '<p>Третий</p>')],
    };
    chaptersResult.data = three;
    const { rerender } = render(
      <BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Следующая глава' }));
    expect(heading('Акт второй')).toBeInTheDocument();

    const prologue = [1, 2, 3].map((n) => chapter('p' + n, n, 'Пролог ' + n, '<p>П' + n + '</p>'));
    chaptersResult.data = { items: [...prologue, ...three.items] };
    rerender(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);
    expect(heading('Акт второй')).toBeInTheDocument();

    chaptersResult.data = { items: [...prologue, three.items[0], three.items[2]] };
    rerender(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);
    expect(heading('Акт третий')).toBeInTheDocument();
  });

  it('пока грузится версия, читалки нет', () => {
    versionResult.data = undefined;
    versionResult.isLoading = true;

    render(<BookVersionPreviewClient lang="ru" versionId="v1" openedFromEditor />);

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});

describe('Кнопка Preview на странице версии', () => {
  const open = vi.fn();

  beforeEach(() => {
    open.mockClear();
    editedVersion.type = 'text';
    vi.stubGlobal('open', open);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('открывает предпросмотр этой версии в новой вкладке', () => {
    render(<EditBookVersionPage params={{ lang: 'es', id: 'version-42' }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview' }));

    expect(open).toHaveBeenCalledWith(
      '/admin/es/books/versions/version-42/preview?from=editor',
      '_blank'
    );
    // Без `noopener`: вкладку с opener «назад» предпросмотра закроет в любом браузере.
    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.calls[0]).toHaveLength(2);
  });

  it.each(['audio', 'referral'])('у %s-версии кнопки нет: текста для читалки там нет', (type) => {
    editedVersion.type = type;

    render(<EditBookVersionPage params={{ lang: 'es', id: 'version-42' }} />);

    expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument();
  });
});

describe('Страница предпросмотра', () => {
  it('флаг «открыт редактором» берётся из адреса, который собирает кнопка Preview', () => {
    const fromEditor = BookVersionPreviewPage({
      params: { lang: 'ru', id: 'v1' },
      searchParams: { from: 'editor' },
    });
    const pasted = BookVersionPreviewPage({ params: { lang: 'ru', id: 'v1' }, searchParams: {} });

    expect(fromEditor.props).toMatchObject({ lang: 'ru', versionId: 'v1', openedFromEditor: true });
    expect(pasted.props.openedFromEditor).toBe(false);
  });
});
