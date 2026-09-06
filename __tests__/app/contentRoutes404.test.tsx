import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/types/api';

/**
 * LEGACY-084. Читалка, плеер и саммари не делали ни одного серверного запроса
 * и потому не могли отдать честный 404: переименованная или никогда не
 * существовавшая книга доезжала до клиентского компонента и превращалась в
 * тот же экран, что и легальная книга без текстовой/аудио версии — оба случая
 * были неотличимы снаружи (HTTP 200 в обоих).
 *
 * Страница теперь сама проверяет существование книги (и, у саммари, — что
 * `versionId` в адресе принадлежит именно ей) до рендера клиентского
 * компонента. Только отсутствие сущности даёт `notFound()`; отсутствие
 * конкретной версии (аудио/текста) книгой не является и остаётся зоной
 * клиентского компонента.
 *
 * 🔴 Два статуса перехода, и их нельзя путать (решение арбитра 06.09.2026):
 * история слагов — 308 `permanentRedirect` (адрес выведен навсегда), канонизация
 * слага — 307 `redirect` (цель зависит от языка и набора опубликованных версий,
 * бессрочно кэшированный 308 закрепил бы один ответ навсегда). Оба случая стоят
 * здесь отдельными проверками именно поэтому.
 */

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error('NEXT_PERMANENT_REDIRECT');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  getBookOverview: vi.fn(),
  resolveRetiredSlug: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
}));

vi.mock('@/api/endpoints/public', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public');
  return { ...actual, getBookOverview: mocks.getBookOverview };
});

vi.mock('@/lib/seo/retired-slug', () => ({
  resolveRetiredSlug: mocks.resolveRetiredSlug,
}));

const notFoundError = () => new ApiError({ message: 'Not found', statusCode: 404 });
const outageError = () => new ApiError({ message: 'Too many requests', statusCode: 429 });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  mocks.permanentRedirect.mockImplementation(() => {
    throw new Error('NEXT_PERMANENT_REDIRECT');
  });
  mocks.redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  mocks.resolveRetiredSlug.mockResolvedValue(null);
});

describe('reader route — 404 честный, а не общий с «нет глав»', () => {
  const run = (slug: string) =>
    import('@/app/[lang]/book/[slug]/read/page').then((m) =>
      m.default({ params: Promise.resolve({ lang: 'en', slug }) })
    );

  it('отдаёт настоящий 404, когда книги нет и преемника у слага нет', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());

    await expect(run('never-existed')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.resolveRetiredSlug).toHaveBeenCalledWith('book', 'en', 'never-existed');
  });

  // LEGACY-062: у переименованной книги подмаршрут обязан вести туда же, куда
  // ведёт сама страница книги, а не в тупик.
  it('уводит 308 на преемника, когда слаг снят с эксплуатации', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('hamlet-new');

    await expect(run('hamlet-old')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/hamlet-new/read');
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  // Второй, независимый путь к отсутствию: запрос не бросил, но сущности нет.
  it('спрашивает историю и на вырожденном успешном ответе', async () => {
    mocks.getBookOverview.mockResolvedValue(undefined);
    mocks.resolveRetiredSlug.mockResolvedValue('hamlet-new');

    await expect(run('hamlet-old')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/hamlet-new/read');
  });

  it('пробрасывает сбой API наверх — это не «книги нет»', async () => {
    mocks.getBookOverview.mockRejectedValue(outageError());

    await expect(run('hamlet')).rejects.toThrow('Too many requests');
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
  });

  // 🔴 Канонизация — 307, а не 308: цель перехода зависит от языка и набора
  // опубликованных версий и обязана переспрашиваться.
  it('канонизирует слаг переходом 307, а не 308', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet-canonical', versions: [] });

    await expect(run('hamlet-other-language')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet-canonical/read');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it('рендерит читалку, когда книга нашлась под тем же слагом', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet', versions: [] });

    const el = await run('hamlet');
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
    expect(el.props.params).toEqual({ lang: 'en', slug: 'hamlet' });
  });
});

describe('player route — 404 честный, а не общий с «нет аудио»', () => {
  const run = (slug: string) =>
    import('@/app/[lang]/book/[slug]/listen/page').then((m) =>
      m.default({ params: Promise.resolve({ lang: 'en', slug }) })
    );

  it('отдаёт настоящий 404, когда книги нет и преемника у слага нет', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());

    await expect(run('never-existed')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('уводит 308 на преемника, когда слаг снят с эксплуатации', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('hamlet-new');

    await expect(run('hamlet-old')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/hamlet-new/listen');
  });

  it('пробрасывает сбой API наверх', async () => {
    mocks.getBookOverview.mockRejectedValue(outageError());

    await expect(run('hamlet')).rejects.toThrow('Too many requests');
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('канонизирует слаг переходом 307, а не 308', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet-canonical', versions: [] });

    await expect(run('hamlet-other-language')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet-canonical/listen');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it('рендерит плеер и передаёт уже загруженную книгу клиенту', async () => {
    const book = { slug: 'hamlet', versions: [], versionIds: { audio: null } };
    mocks.getBookOverview.mockResolvedValue(book);

    const el = await run('hamlet');
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(el.props.initialBook).toBe(book);
  });
});

describe('summary route — 404 честный на несуществующую книгу и на чужой versionId', () => {
  const run = (bookSlug: string, versionId: string) =>
    import('@/app/[lang]/summary/[bookSlug]/[versionId]/page').then((m) =>
      m.default({ params: Promise.resolve({ lang: 'en', bookSlug, versionId }) })
    );

  it('отдаёт настоящий 404, когда книги нет и преемника у слага нет', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());

    await expect(run('never-existed', 'v1')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('уводит 308 на преемника, сохраняя versionId', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('hamlet-new');

    await expect(run('hamlet-old', 'v1')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/summary/hamlet-new/v1');
  });

  it('отдаёт 404, когда versionId в адресе не принадлежит этой книге', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet', versions: [{ id: 'v1' }] });

    await expect(run('hamlet', 'v-stale')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  // 🔴 Отсутствие самого поля `versions` — отказ, а не отрицательный ответ:
  // иначе сужение белого списка на стороне `books` похоронило бы весь раздел
  // `/{lang}/summary/**` под кэшируемым 404 при зелёных тестах.
  it('не выдаёт отсутствие поля versions за отсутствие версии', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet' });

    await expect(run('hamlet', 'v1')).rejects.toThrow(/carries no versions array/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('пробрасывает сбой API наверх', async () => {
    mocks.getBookOverview.mockRejectedValue(outageError());

    await expect(run('hamlet', 'v1')).rejects.toThrow('Too many requests');
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('канонизирует слаг переходом 307, а не 308', async () => {
    mocks.getBookOverview.mockResolvedValue({
      slug: 'hamlet-canonical',
      versions: [{ id: 'v1' }],
    });

    await expect(run('hamlet-other-language', 'v1')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/summary/hamlet-canonical/v1');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it('рендерит саммари, когда versionId принадлежит книге', async () => {
    const book = { slug: 'hamlet', versions: [{ id: 'v1' }] };
    mocks.getBookOverview.mockResolvedValue(book);

    const el = await run('hamlet', 'v1');
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(el.props.initialBook).toBe(book);
  });
});
