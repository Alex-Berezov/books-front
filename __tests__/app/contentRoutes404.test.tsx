// @vitest-environment node
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

// F03-3, решение арбитра `F03 | F03-3`, В2: ссылка «глава N» не теряет номер главы на переходе
// читалки - ни на канонический слаг (307), ни по истории слагов (308).
describe('reader route - номер главы на переходах', () => {
  const run = (slug: string, search: Record<string, string | string[] | undefined>) =>
    import('@/app/[lang]/book/[slug]/read/page').then((m) =>
      m.default({
        params: Promise.resolve({ lang: 'en', slug }),
        searchParams: Promise.resolve(search),
      })
    );

  it('307 на канонический слаг переносит ?chapter=N', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet-canonical', versions: [] });

    await expect(run('hamlet-old', { chapter: '3' })).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet-canonical/read?chapter=3');
  });

  it('308 по истории слагов переносит ?chapter=N', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('hamlet-new');

    await expect(run('hamlet-old', { chapter: '12' })).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/hamlet-new/read?chapter=12');
  });

  it('мусорный номер и прочие параметры не переносятся', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet-canonical', versions: [] });

    await expect(run('hamlet-old', { chapter: 'abc', utm: 'x' })).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet-canonical/read');

    mocks.redirect.mockClear();
    await expect(run('hamlet-old', { chapter: ['2', '3'] })).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/hamlet-canonical/read');
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

describe('summary: старый адрес /summary/{slug}/{versionId}', () => {
  const run = (bookSlug: string, versionId: string) =>
    import('@/app/[lang]/summary/[bookSlug]/[versionId]/page').then((m) =>
      m.default({ params: Promise.resolve({ lang: 'en', bookSlug, versionId }) })
    );

  // Страница переехала на `/{lang}/book/{slug}/summary` (решение владельца 17.10.2026): 308 ведёт
  // на пересказ версии из адреса - её язык и слаг.
  it('уводит 308 на пересказ версии из адреса, на её языке и слаге', async () => {
    mocks.getBookOverview.mockResolvedValue({
      slug: 'hamlet',
      versions: [
        { id: 'v-en', language: 'en', slug: 'hamlet', _count: { summaries: 1 } },
        { id: 'v-ru', language: 'ru', slug: 'gamlet', _count: { summaries: 1 } },
      ],
    });

    await expect(run('hamlet', 'v-ru')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/ru/book/gamlet/summary');
  });

  it('версия не принадлежит книге - 404, а не 308 в никуда', async () => {
    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet', versions: [{ id: 'v-en' }] });

    await expect(run('hamlet', 'v-stale')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it('книги нет - 404; нет поля versions - отказ, а не 404', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());
    await expect(run('never-existed', 'v1')).rejects.toThrow('NEXT_NOT_FOUND');

    mocks.getBookOverview.mockResolvedValue({ slug: 'hamlet' });
    await expect(run('hamlet', 'v1')).rejects.toThrow(/carries no versions array/);
  });

  it('у версии нет пересказа - 404, а не 308 в 404', async () => {
    mocks.getBookOverview.mockResolvedValue({
      slug: 'hamlet',
      versions: [{ id: 'v-en', language: 'en', slug: 'hamlet', _count: { summaries: 0 } }],
    });

    await expect(run('hamlet', 'v-en')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it('у версии нет языка и слага - язык пути и слаг книги', async () => {
    mocks.getBookOverview.mockResolvedValue({
      slug: 'hamlet',
      versions: [{ id: 'v-x', _count: { summaries: 1 } }],
    });

    await expect(run('hamlet', 'v-x')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/hamlet/summary');
  });

  it('переименованный слаг - 308 на старый адрес преемника, сбой API - наверх', async () => {
    mocks.getBookOverview.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('hamlet-new');
    await expect(run('hamlet-old', 'v1')).rejects.toThrow('NEXT_PERMANENT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/summary/hamlet-new/v1');

    mocks.getBookOverview.mockRejectedValue(outageError());
    await expect(run('hamlet', 'v1')).rejects.toThrow('Too many requests');
  });

  it('нет счётчика пересказов у версии - отказ, а не кэшируемый 404', async () => {
    mocks.getBookOverview.mockResolvedValue({
      slug: 'hamlet',
      versions: [{ id: 'v-en', language: 'en', slug: 'hamlet' }],
    });

    await expect(run('hamlet', 'v-en')).rejects.toThrow(/carries no summary count/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});
