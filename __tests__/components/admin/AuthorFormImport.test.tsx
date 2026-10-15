import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorForm } from '@/components/admin/authors/AuthorForm/AuthorForm';
import { ApiError } from '@/types/api';
import type { Author, AuthorPromptInputs } from '@/types/api-schema';
import example from '../../fixtures/example-author.json';

// F02-2: импорт JSON со слиянием по T5, блоки страницы автора в форме, портрет без копии в og
// (решение арбитра В6), предупреждения о ненайденных слагах и «Вводные для промпта».

const { updateSpy, createSpy, enqueueSpy, refetchSpy, loadSpy, buildSpy, realBuild } = vi.hoisted(
  () => ({
    // Настоящая сборка тела: `beforeEach` возвращает её, даже если тест упал до своего восстановления.
    realBuild: { fn: undefined as undefined | ((...args: never[]) => unknown) },
    updateSpy: vi.fn((_vars: unknown): Promise<unknown> => Promise.resolve({})),
    createSpy: vi.fn((_vars: unknown): Promise<unknown> => Promise.resolve({})),
    enqueueSpy: vi.fn(),
    refetchSpy: vi.fn(),
    loadSpy: vi.fn(),
    buildSpy: vi.fn(),
  })
);

// Сборка тела — настоящая; тест ворот сохранения подменяет её, чтобы проверять сами ворота.
vi.mock('@/lib/admin/author-request', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin/author-request')>();
  buildSpy.mockImplementation(actual.buildAuthorRequest);
  realBuild.fn = actual.buildAuthorRequest;
  return { ...actual, buildAuthorRequest: (...args: unknown[]) => buildSpy(...args) };
});

// Ленивую загрузку проверок подменяем, чтобы проверить ветки её отказа.
vi.mock('@/lib/admin/load-author-validation', () => ({
  loadAuthorValidation: () => loadSpy(),
}));

const loadRealValidation = () => import('@/lib/admin/author-validation');

/** `navigator` jsdom без буфера обмена: подменяем целиком на время теста. */
const stubClipboard = (clipboard: Record<string, unknown>) =>
  vi.stubGlobal('navigator', { userAgent: window.navigator.userAgent, clipboard });

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/en/authors/a1/edit',
}));

vi.mock('notistack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('notistack')>();
  return {
    ...actual,
    useSnackbar: () => ({ enqueueSnackbar: enqueueSpy, closeSnackbar: vi.fn() }),
  };
});

vi.mock('@/api/hooks/useAuthors', () => ({
  useCreateAuthor: () => ({ mutateAsync: createSpy, isPending: false }),
  useUpdateAuthor: () => ({ mutateAsync: updateSpy, isPending: false }),
  useAuthorPromptInputs: () => ({ refetch: refetchSpy, isFetching: false }),
}));

vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: () => null,
}));

vi.mock('@/components/admin/common/MediaPicker/MediaPicker', () => ({
  MediaPicker: ({ onChange }: { onChange: (url: string | null) => void }) => (
    <button type="button" onClick={() => onChange('https://cdn.example.org/new.jpg')}>
      pick photo
    </button>
  ),
}));

const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

type SentTranslation = Record<string, unknown> & {
  language: string;
  seo?: Record<string, unknown>;
};
type Sent = { data: Record<string, unknown> & { translations: SentTranslation[] } };

const sentPayload = (spy: typeof updateSpy) => spy.mock.calls[0][0] as Sent;

const oldAuthor = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'a1',
    birthDate: '1828-09-09',
    translations: [
      {
        language: 'en',
        name: 'Leo Tolstoy',
        slug: 'leo-tolstoy',
        biography: '<p>Bio</p>',
        quotes: [{ text: 'All happy families are alike', source: '' }],
        faq: [{ question: 'Q', answer: 'A' }],
        ...overrides,
      },
    ],
  }) as unknown as Author;

const promptInputs: AuthorPromptInputs = {
  id: 'a1',
  birthDate: null,
  deathDate: null,
  names: [{ lang: 'en', name: 'Leo Tolstoy', slug: 'leo-tolstoy' }],
  books: [],
  authors: [],
  authorsTruncated: false,
};

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

// Проверка импорта грузится лениво при открытии окна: пока грузится — «Loading validation…».
const importJson = async (json: unknown) => {
  fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));
  await waitFor(() => expect(screen.queryByText('Loading validation…')).toBeNull());
  fireEvent.change(screen.getByRole('textbox', { name: 'Import author data' }), {
    target: { value: JSON.stringify(json) },
  });
};

describe('AuthorForm: импорт JSON и блоки страницы автора (F02-2)', () => {
  beforeEach(() => {
    updateSpy.mockReset().mockResolvedValue({});
    createSpy.mockReset().mockResolvedValue({});
    enqueueSpy.mockClear();
    refetchSpy.mockReset();
    loadSpy.mockReset().mockImplementation(loadRealValidation);
    buildSpy.mockReset().mockImplementation(realBuild.fn as (...args: unknown[]) => unknown);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('старый автор (биография, цитаты без bookSlug, faq) сохраняется без ошибок', async () => {
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    save();

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const en = sentPayload(updateSpy).data.translations[0];
    expect(en.quotes).toEqual([{ text: 'All happy families are alike' }]);
    expect(en.faq).toEqual([{ question: 'Q', answer: 'A' }]);
    expect(en.awards).toBeNull();
    expect(en.facts).toBeNull();
    expect(sentPayload(updateSpy).data.photoCredit).toBeNull();
  });

  it('импорт эталонного JSON доезжает до запроса, портрет не уходит в ogImageUrl', async () => {
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    await importJson({
      ...example,
      translations: {
        ...example.translations,
        en: { ...example.translations.en, photoUrl: 'https://cdn.example.org/x.jpg' },
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    save();

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const { data } = sentPayload(updateSpy);
    const en = data.translations.find((t) => t.language === 'en')!;
    expect(data.nativeName).toBe('Лев Николаевич Толстой');
    expect(en.tagline).toBe('Russian writer, author of War and Peace and Anna Karenina');
    expect(en.notableWorks).toHaveLength(4);
    expect(en.quotes).toEqual([
      {
        text: 'All happy families are alike; each unhappy family is unhappy in its own way.',
        source: 'Anna Karenina',
        bookSlug: 'anna-karenina',
      },
    ]);
    expect(en.facts).toMatchObject({ gender: 'male', languages: ['Russian'] });
    expect(en.photoUrl).toBe('https://cdn.example.org/x.jpg');
    expect(en.seo).not.toHaveProperty('ogImageUrl');
    // Биография старого автора не тронута: в JSON данных её нет.
    expect(en.biography).toBe('<p>Bio</p>');
  });

  it('в окне импорта: ошибка с путём блокирует импорт, список «будут очищены» — не блокирует', async () => {
    render(<AuthorForm lang="en" author={oldAuthor()} />);

    await importJson({
      translations: { ru: { funFacts: [{ text: 'x', sourceTitle: 'y', sourceUrl: 'z' }] } },
    });
    expect(
      screen.getByText('ru → funFacts[0].sourceUrl: must be an absolute http(s) link')
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import' })).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByRole('textbox', { name: 'Import author data' }), {
      target: { value: JSON.stringify({ translations: { en: { quotes: [], extra: 1 } } }) },
    });
    expect(screen.getByText('These filled fields will be cleared:')).toBeTruthy();
    expect(screen.getByText('en → quotes')).toBeTruthy();
    expect(screen.getByText('Unknown keys will be skipped:')).toBeTruthy();
    expect(screen.getByText('en → extra')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import' })).toHaveProperty('disabled', false);
  });

  it('ошибка в JSON-редакторе блока не даёт сохранить и называет путь', async () => {
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: /EN/ }));
    fireEvent.change(screen.getByLabelText('Awards'), {
      target: { value: '[{"name": "Nobel", "year": "1902"}]' },
    });
    save();

    await waitFor(() => expect(enqueueSpy).toHaveBeenCalled());
    expect(updateSpy).not.toHaveBeenCalled();
    expect(screen.getAllByText('en → awards[0].year: must be a number').length).toBeGreaterThan(0);
  });

  it('старые данные, не проходящие схему, не уходят: сохранение ждёт проверки и называет путь', async () => {
    render(
      <AuthorForm
        lang="en"
        author={oldAuthor({ funFacts: [{ text: 't', sourceTitle: 's', sourceUrl: 'not-a-url' }] })}
      />
    );
    save();

    await waitFor(() => expect(enqueueSpy).toHaveBeenCalled());
    expect(updateSpy).not.toHaveBeenCalled();
    const [message] = enqueueSpy.mock.calls[0];
    rtlRender(message as ReactElement);
    expect(
      screen.getByText('en → funFacts[0].sourceUrl: must be an absolute http(s) link')
    ).toBeTruthy();
  });

  it('смена портрета: og, равный прежнему портрету, очищается', async () => {
    render(
      <AuthorForm
        lang="en"
        author={oldAuthor({
          photoUrl: 'https://cdn.example.org/old.jpg',
          seo: { ogImageUrl: 'https://cdn.example.org/old.jpg' },
        })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'pick photo' }));
    save();

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const en = sentPayload(updateSpy).data.translations[0];
    expect(en.photoUrl).toBe('https://cdn.example.org/new.jpg');
    expect(en.seo).not.toHaveProperty('ogImageUrl');
  });

  it('смена портрета: og, выставленный вручную, не трогается', async () => {
    render(
      <AuthorForm
        lang="en"
        author={oldAuthor({
          photoUrl: 'https://cdn.example.org/old.jpg',
          seo: { ogImageUrl: 'https://cdn.example.org/og.jpg' },
        })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'pick photo' }));
    save();

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(sentPayload(updateSpy).data.translations[0].seo).toMatchObject({
      ogImageUrl: 'https://cdn.example.org/og.jpg',
    });
  });

  it('ненайденные слаги из ответа — предупреждение, сохранение не отменяется', async () => {
    updateSpy.mockResolvedValue({
      warnings: [{ lang: 'ru', path: 'startHere[0].bookSlug', slug: 'voyna-i-mir' }],
    });
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    save();

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ variant: 'warning' })
      )
    );
    const [message] = enqueueSpy.mock.calls.find(([, opts]) => opts?.variant === 'warning')!;
    rtlRender(message as ReactElement);
    expect(screen.getByText('Not found on the site, will be shown without a link:')).toBeTruthy();
    expect(screen.getByText('ru → startHere[0].bookSlug → voyna-i-mir')).toBeTruthy();
  });

  it('warnings: null — «не удалось проверить ссылки», а не «всё найдено»', async () => {
    updateSpy.mockResolvedValue({ warnings: null });
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    save();

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith('Could not check the links to books and authors', {
        variant: 'warning',
      })
    );
  });

  it('«Вводные для промпта» копируют текст в буфер и предупреждают об обрезке списка авторов', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    const data: AuthorPromptInputs = {
      id: 'a1',
      birthDate: '1828-09-09',
      deathDate: null,
      names: [{ lang: 'en', name: 'Leo Tolstoy', slug: 'leo-tolstoy' }],
      books: [],
      authors: [],
      authorsTruncated: true,
    };
    refetchSpy.mockResolvedValue({ data });
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Prompt inputs' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain('Имя автора:\nen: Leo Tolstoy');
    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith(
        'The author list is incomplete: the site has more authors than fit',
        { variant: 'warning' }
      )
    );
  });

  it('«Вводные для промпта»: запрос упал — сообщение об этом, в буфер ничего', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    refetchSpy.mockResolvedValue({ isError: true, data: undefined });
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Prompt inputs' }));

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith('Could not load prompt inputs', { variant: 'error' })
    );
    expect(writeText).not.toHaveBeenCalled();
  });

  it('«Вводные для промпта»: буфер отказал — своё сообщение', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    refetchSpy.mockResolvedValue({ data: promptInputs });
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Prompt inputs' }));

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith('Could not copy to the clipboard', {
        variant: 'error',
      })
    );
  });

  it('сбой загрузки проверки при сохранении — запрос не уходит', async () => {
    // Сборка тела исправна и вернула бы годное тело — запрос держит только отказ загрузки.
    buildSpy.mockReturnValue({ kind: 'ok', payload: { translations: [] } });
    loadSpy.mockRejectedValue(new Error('chunk load failed'));
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    save();

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith('Could not load data validation, try again', {
        variant: 'error',
      })
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('сбой загрузки проверки в окне импорта — ошибка и повтор, а не вечная загрузка', async () => {
    loadSpy.mockRejectedValueOnce(new Error('chunk load failed'));
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Import JSON' }));

    expect(await screen.findByText('Could not load data validation.')).toBeTruthy();
    expect(screen.queryByText('Loading validation…')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.queryByText('Could not load data validation.')).toBeNull());
    await waitFor(() => expect(screen.queryByText('Loading validation…')).toBeNull());
    fireEvent.change(screen.getByRole('textbox', { name: 'Import author data' }), {
      target: { value: JSON.stringify({ translations: { en: { tagline: 'x' } } }) },
    });
    expect(screen.getByRole('button', { name: 'Import' })).toHaveProperty('disabled', false);
  });

  it('сбой загрузки проверки при правке редактора — «Checking…» снимается', async () => {
    loadSpy.mockRejectedValue(new Error('chunk load failed'));
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: /EN/ }));
    fireEvent.change(screen.getByLabelText('Awards'), { target: { value: '[]' } });

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith('Could not load data validation, try again', {
        variant: 'error',
      })
    );
    await waitFor(() => expect(screen.queryByText('Checking…')).toBeNull());
  });

  it('сбой загрузки при наборе в редакторе — один тост на сбой, а не на каждый символ', async () => {
    let fail!: (error: Error) => void;
    const loading = new Promise<never>((_, reject) => {
      fail = reject;
    });
    loading.catch(() => undefined);
    loadSpy.mockReturnValue(loading);
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: /EN/ }));
    const editor = screen.getByLabelText('Awards');
    for (const text of ['[', '[]', '[ ]']) fireEvent.change(editor, { target: { value: text } });

    await act(async () => {
      fail(new Error('chunk load failed'));
      await loading.catch(() => undefined);
    });

    await waitFor(() => expect(screen.queryByText('Checking…')).toBeNull());
    const failures = enqueueSpy.mock.calls.filter(
      ([message]) => message === 'Could not load data validation, try again'
    );
    expect(failures).toHaveLength(1);
  });

  it('ответ создания с warnings — предупреждение о ненайденных слагах', async () => {
    createSpy.mockResolvedValue({
      warnings: [{ lang: 'en', path: 'quotes[0].bookSlug', slug: 'missing' }],
    });
    render(<AuthorForm lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: /EN/ }));
    fireEvent.change(screen.getByLabelText('Author Name (EN) *'), {
      target: { value: 'Leo Tolstoy' },
    });
    fireEvent.change(screen.getByLabelText('Slug (EN) *'), { target: { value: 'leo-tolstoy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Author' }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ variant: 'warning' })
      )
    );
    const [message] = enqueueSpy.mock.calls.find(([, opts]) => opts?.variant === 'warning')!;
    rtlRender(message as ReactElement);
    expect(screen.getByText('Not found on the site, will be shown without a link:')).toBeTruthy();
    expect(screen.getByText('en → quotes[0].bookSlug → missing')).toBeTruthy();
  });

  it('5xx при сохранении — свой тост не показывается (есть общий), 4xx — показывается', async () => {
    updateSpy.mockRejectedValue(
      new ApiError({ statusCode: 503, error: 'Service Unavailable', message: 'down' })
    );
    const { unmount } = render(<AuthorForm lang="en" author={oldAuthor()} />);
    save();
    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    // Обработчик сохранения ждал этот же отказ раньше теста — к этой точке он уже отработал.
    await (updateSpy.mock.results[0].value as Promise<unknown>).catch(() => undefined);
    expect(enqueueSpy).not.toHaveBeenCalledWith('down', expect.anything());
    unmount();

    updateSpy
      .mockReset()
      .mockRejectedValue(
        new ApiError({ statusCode: 409, error: 'Conflict', message: 'slug taken' })
      );
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    save();
    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith('slug taken', { variant: 'error' })
    );
  });

  it('перевод, который есть у автора, с пустым именем — отказ, а не тихий пропуск языка', async () => {
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: /EN/ }));
    fireEvent.change(screen.getByLabelText('Author Name (EN) *'), { target: { value: '' } });
    save();

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith(
        'Name is required for language EN: without it the translation and its page would be deleted',
        { variant: 'error' }
      )
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('список фактов — тегами: значение с запятой уходит одним элементом', async () => {
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    fireEvent.click(screen.getByRole('button', { name: /EN/ }));
    const input = screen.getByLabelText('Pseudonyms (Enter adds an item)');
    fireEvent.change(input, { target: { value: 'Yasnaya Polyana, Russian Empire' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13 });
    save();

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(sentPayload(updateSpy).data.translations[0].facts).toEqual({
      pseudonyms: ['Yasnaya Polyana, Russian Empire'],
    });
  });

  it('«Вводные для промпта»: 5xx — свой тост не показывается (есть общий)', async () => {
    stubClipboard({ writeText: vi.fn() });
    let finish!: (value: unknown) => void;
    refetchSpy.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    const button = screen.getByRole('button', { name: 'Prompt inputs' });
    fireEvent.click(button);
    await waitFor(() => expect(button.className).toContain('ant-btn-loading'));

    finish({
      isError: true,
      data: undefined,
      error: new ApiError({ statusCode: 502, error: 'Bad Gateway', message: 'down' }),
    });

    // Кнопка снимает загрузку в самом конце обработки — после всех тостов.
    await waitFor(() => expect(button.className).not.toContain('ant-btn-loading'));
    expect(enqueueSpy).not.toHaveBeenCalled();
  });

  it('язык с данными, но без имени: предупреждение в окне импорта и отказ при сохранении', async () => {
    render(<AuthorForm lang="en" author={oldAuthor()} />);
    await importJson({ translations: { es: { biography: '<p>Biografía</p>' } } });

    expect(
      screen.getByText(
        'No name — the translation will not be created until the name and slug are filled in:'
      )
    ).toBeTruthy();
    expect(screen.getByText('es: no name')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Import' }));
    save();

    await waitFor(() =>
      expect(enqueueSpy).toHaveBeenCalledWith(
        'These languages have data but no name, so their translation would not be created: ES. Fill in the name and slug, or clear the data',
        { variant: 'error' }
      )
    );
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('«Вводные для промпта» нет у нового автора', () => {
    render(<AuthorForm lang="en" />);

    expect(screen.queryByRole('button', { name: 'Prompt inputs' })).toBeNull();
  });
});
