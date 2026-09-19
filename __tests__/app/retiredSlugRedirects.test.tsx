// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/types/api';

/**
 * Сплошная ревизия путей 404 (LEGACY-062, продолжение).
 *
 * Страница приходит к 404 **двумя** независимыми путями: API вернул пустую сущность,
 * либо сам запрос ответил 404 и до этой проверки дело не дошло. Закрытие одного даёт
 * редирект «через раз» — в зависимости от того, каким способом API сообщил об
 * отсутствии. Поэтому каждая страница проверяется по обоим путям отдельно.
 *
 * 🔴 И отдельно — порядок: история спрашивается ТОЛЬКО после того, как попытка отдать
 * живую сущность провалилась. Слаг, освобождённый и занятый заново, при обратном
 * порядке увёл бы посетителя со страницы, которая существует. Посадка на это —
 * `expect(resolveRetiredSlug).not.toHaveBeenCalled()`; без неё вся остальная батарея
 * остаётся зелёной и при неверном порядке.
 */

const mocks = vi.hoisted(() => ({
  resolveRetiredSlug: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  getCachedBookOverview: vi.fn(),
  getCachedBookSeo: vi.fn(),
  getPublicAuthorBySlug: vi.fn(),
  resolveSeo: vi.fn(),
  httpGet: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock('@/lib/seo/retired-slug', () => ({
  resolveRetiredSlug: mocks.resolveRetiredSlug,
}));

vi.mock('@/app/[lang]/book/[slug]/bookData', () => ({
  getCachedBookOverview: mocks.getCachedBookOverview,
  getCachedBookSeo: mocks.getCachedBookSeo,
}));

vi.mock('@/api/endpoints/public', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public');
  return {
    ...actual,
    getPublicAuthorBySlug: mocks.getPublicAuthorBySlug,
    resolveSeo: mocks.resolveSeo,
  };
});

vi.mock('@/lib/http', async () => {
  const actual = await vi.importActual<typeof import('@/lib/http')>('@/lib/http');
  return { ...actual, httpGet: mocks.httpGet };
});

/**
 * 🔴 Потолок на **загрузку модуля страницы**, а не на тест.
 *
 * Страницы грузятся динамическим `import`, и первый тест блока платил трансформацию
 * всего графа импортов страницы из собственного бюджета `testTimeout: 15000`. В одиночку
 * файл проходит за 5,6 с, под полным прогоном тот же первый тест упирался в потолок
 * (16790 мс) — красное приходило на разные тесты в зависимости от нагрузки машины.
 * Дважды: 19.09.2026 по `LEGACY-006` и в тот же день по `LEGACY-005`.
 *
 * Поэтому загрузка поднята в `beforeAll` со своим щедрым потолком. `testTimeout` не тронут:
 * сами тесты по-прежнему обязаны укладываться в 15 с, и зависший тест краснеет как раньше.
 * В хуке держится **только** загрузка модуля — ни ожиданий, ни настройки моков
 * (решение арбитра 19.09.2026, `decisions-log.md`).
 */
const MODULE_LOAD_TIMEOUT_MS = 60_000;

const notFoundError = () => new ApiError({ message: 'Not found', statusCode: 404 });
const outageError = () => new ApiError({ message: 'Too many requests', statusCode: 429 });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  mocks.permanentRedirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  mocks.resolveRetiredSlug.mockResolvedValue(null);
});

describe('book detail page — оба пути к 404 спрашивают историю слагов', () => {
  let page: (typeof import('@/app/[lang]/book/[slug]/page'))['default'];

  beforeAll(async () => {
    page = (await import('@/app/[lang]/book/[slug]/page')).default;
  }, MODULE_LOAD_TIMEOUT_MS);

  // `async` здесь не украшение: без него синхронный бросок внутри страницы уходил бы
  // наружу синхронно, а прежняя форма через `import().then(...)` обращала его в отказ
  // промиса. Ожидания `rejects` в тестах рассчитаны на отказ.
  const run = async (slug: string) => page({ params: Promise.resolve({ lang: 'en', slug }) });

  it('редиректит 308 на преемника, когда API ответил 404', async () => {
    mocks.getCachedBookOverview.mockRejectedValue(notFoundError());
    mocks.getCachedBookSeo.mockResolvedValue(null);
    mocks.resolveRetiredSlug.mockResolvedValue('war-and-peace');

    await expect(run('voyna-i-mir')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.resolveRetiredSlug).toHaveBeenCalledWith('book', 'en', 'voyna-i-mir');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/war-and-peace');
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  // Второй, независимый путь: запрос не бросил, но сущности нет (вырожденный 200/204).
  it('редиректит 308 и на вырожденном успешном ответе', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(undefined);
    mocks.getCachedBookSeo.mockResolvedValue(null);
    mocks.resolveRetiredSlug.mockResolvedValue('war-and-peace');

    await expect(run('voyna-i-mir')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/book/war-and-peace');
  });

  it('отдаёт честный 404, когда преемника нет', async () => {
    mocks.getCachedBookOverview.mockRejectedValue(notFoundError());
    mocks.getCachedBookSeo.mockResolvedValue(null);
    mocks.resolveRetiredSlug.mockResolvedValue(null);

    await expect(run('never-existed')).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  // Посадка LEGACY-063: сбой запроса не равен «книги нет».
  it('пробрасывает не-404 наверх и не трогает ни 404, ни редирект', async () => {
    mocks.getCachedBookOverview.mockRejectedValue(outageError());
    mocks.getCachedBookSeo.mockResolvedValue(null);

    await expect(run('hamlet')).rejects.toThrow('Too many requests');

    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  // 🔴 Главная посадка на порядок.
  it('НЕ спрашивает историю, когда книга нашлась', async () => {
    mocks.getCachedBookOverview.mockResolvedValue({ slug: 'hamlet', versionIds: {}, versions: [] });
    mocks.getCachedBookSeo.mockResolvedValue(null);

    await run('hamlet').catch(() => undefined);

    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
  });
});

describe('author page — оба пути к 404 спрашивают историю слагов', () => {
  let page: (typeof import('@/app/[lang]/author/[authorSlug]/page'))['default'];

  beforeAll(async () => {
    page = (await import('@/app/[lang]/author/[authorSlug]/page')).default;
  }, MODULE_LOAD_TIMEOUT_MS);

  const run = async (authorSlug: string) =>
    page({ params: Promise.resolve({ lang: 'ru', authorSlug }) });

  it('редиректит 308 на преемника, когда API ответил 404', async () => {
    mocks.getPublicAuthorBySlug.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('sun-czy');

    await expect(run('sun-tzu')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.resolveRetiredSlug).toHaveBeenCalledWith('author', 'ru', 'sun-tzu');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/ru/author/sun-czy');
  });

  // Дыра, не закрытая ничем до 09.08.2026: контракт держался на том, что бэкенд
  // честно бросает NotFoundException, а не на коде страницы.
  it('редиректит 308 и на вырожденном успешном ответе', async () => {
    mocks.getPublicAuthorBySlug.mockResolvedValue(null);
    mocks.resolveRetiredSlug.mockResolvedValue('sun-czy');

    await expect(run('sun-tzu')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/ru/author/sun-czy');
  });

  it('отдаёт честный 404, когда преемника нет', async () => {
    mocks.getPublicAuthorBySlug.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue(null);

    await expect(run('never-existed')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it('пробрасывает не-404 наверх', async () => {
    mocks.getPublicAuthorBySlug.mockRejectedValue(outageError());

    await expect(run('sun-tzu')).rejects.toThrow('Too many requests');
    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
  });
});

describe('tag page — оба пути к 404 спрашивают историю слагов', () => {
  let tagPage: (typeof import('@/app/[lang]/tag/[tagSlug]/page'))['default'];

  beforeAll(async () => {
    tagPage = (await import('@/app/[lang]/tag/[tagSlug]/page')).default;
  }, MODULE_LOAD_TIMEOUT_MS);

  const run = async (tagSlug: string, page?: string) =>
    tagPage({
      params: Promise.resolve({ lang: 'es', tagSlug }),
      searchParams: Promise.resolve(page ? { page } : {}),
    });

  /** Страница тега шлёт два запроса: SEO-бандл (его отказ проглатывается) и карточки. */
  const arrange = (cards: unknown) =>
    mocks.httpGet.mockImplementation((endpoint: string) =>
      endpoint.includes('/seo/resolve')
        ? Promise.reject(notFoundError())
        : cards instanceof Error
          ? Promise.reject(cards)
          : Promise.resolve(cards)
    );

  it('редиректит 308 на преемника, когда API ответил 404', async () => {
    arrange(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('adventure');

    await expect(run('priklyucheniya')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.resolveRetiredSlug).toHaveBeenCalledWith('tag', 'es', 'priklyucheniya');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/es/tag/adventure');
  });

  it('переносит номер страницы в редирект', async () => {
    arrange(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('adventure');

    await expect(run('priklyucheniya', '3')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/es/tag/adventure?page=3');
  });

  it('редиректит 308 и когда API вернул `tag: null`', async () => {
    arrange({ tag: null, items: [], pagination: { total: 0, totalPages: 0 } });
    mocks.resolveRetiredSlug.mockResolvedValue('adventure');

    await expect(run('priklyucheniya')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/es/tag/adventure');
  });

  it('отдаёт честный 404, когда преемника нет', async () => {
    arrange(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue(null);

    await expect(run('never-existed')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it('пробрасывает не-404 наверх', async () => {
    arrange(outageError());

    await expect(run('priklyucheniya')).rejects.toThrow('Too many requests');
    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});

describe('catalog redirect page — сбой API больше не превращается в постоянный 308', () => {
  let page: (typeof import('@/app/[lang]/catalog/[categorySlug]/page'))['default'];

  beforeAll(async () => {
    page = (await import('@/app/[lang]/catalog/[categorySlug]/page')).default;
  }, MODULE_LOAD_TIMEOUT_MS);

  const run = async (categorySlug: string) =>
    page({ params: Promise.resolve({ lang: 'en', categorySlug }) });

  it('уводит на живой сегмент, не спрашивая историю', async () => {
    mocks.resolveSeo.mockImplementation((_lang: string, type: string) =>
      type === 'genre' ? Promise.resolve({}) : Promise.reject(notFoundError())
    );

    await expect(run('historical-fiction')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/genre/historical-fiction');
    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
  });

  // Коллекции здесь не рассматривались вовсе — их слаг получал 308 на общий каталог,
  // хотя живая страница существует.
  it('распознаёт коллекцию, а не уводит её в общий каталог', async () => {
    mocks.resolveSeo.mockImplementation((_lang: string, type: string) =>
      type === 'collection' ? Promise.resolve({}) : Promise.reject(notFoundError())
    );

    await expect(run('best-of-2026')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/collection/best-of-2026');
  });

  it('спрашивает историю, когда все три типа честно ответили 404', async () => {
    mocks.resolveSeo.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue('novels');

    await expect(run('romany')).rejects.toThrow('NEXT_REDIRECT');

    expect(mocks.resolveRetiredSlug).toHaveBeenCalledWith('category', 'en', 'romany');
    expect(mocks.permanentRedirect).toHaveBeenCalledWith('/en/category/novels');
  });

  it('отдаёт 404, а не редирект на общий каталог, когда преемника нет', async () => {
    mocks.resolveSeo.mockRejectedValue(notFoundError());
    mocks.resolveRetiredSlug.mockResolvedValue(null);

    await expect(run('never-existed')).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  // Контрольный вход: до правки этот кейс давал ПОСТОЯННЫЙ 308 на /en/catalog —
  // решение, принятое во время сбоя API, закреплялось навсегда.
  it('пробрасывает не-404 наверх, а не превращает сбой в постоянный редирект', async () => {
    mocks.resolveSeo.mockRejectedValue(outageError());

    await expect(run('historical-fiction')).rejects.toThrow('Too many requests');

    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.resolveRetiredSlug).not.toHaveBeenCalled();
  });
});

/**
 * `LEGACY-391`. Номер страницы на редиректе по истории слагов НЕ переносится
 * на трёх страницах категорий — и это утверждение, а не пропуск.
 *
 * До 15.09.2026 перенос был верен: преемником из истории всегда оказывался тот же
 * термин после переименования, и страница N у него осмысленна. С закрытием
 * `LEGACY-085` преемником стал бывать **родительский** термин — другой список
 * другой длины, где страницы N может не быть вовсе. Отличить переименование
 * от смены сущности нечем: ответ `GET /:lang/slug-redirect` отдаёт только
 * `{ newSlug }`. Цена ошибки несимметрична — пустая страница под 308 кэшируется
 * у посетителя навсегда, а потеря позиции в списке стоит одного клика пагинации
 * (решение арбитра 15.09.2026, `decisions-log.md`).
 *
 * 🔴 Страница тега в этот набор не входит намеренно: у `Tag` родителя нет
 * по построению схемы, преемник там всегда тот же термин, и перенос `?page`
 * на ней остаётся — см. кейс «переносит номер страницы в редирект» выше.
 */
const taxonomyPages = [
  { segment: 'category', load: () => import('@/app/[lang]/category/[slug]/page') },
  { segment: 'genre', load: () => import('@/app/[lang]/genre/[slug]/page') },
  { segment: 'collection', load: () => import('@/app/[lang]/collection/[slug]/page') },
];

for (const { segment, load } of taxonomyPages) {
  describe(`${segment} page — LEGACY-391: номер страницы на редирект не переносится`, () => {
    let taxonomyPage: Awaited<ReturnType<typeof load>>['default'];

    beforeAll(async () => {
      taxonomyPage = (await load()).default;
    }, MODULE_LOAD_TIMEOUT_MS);

    const run = async (slug: string, page?: string) =>
      taxonomyPage({
        params: Promise.resolve({ lang: 'ru', slug }),
        searchParams: Promise.resolve(page ? { page } : {}),
      });

    /** Карточки — единственный запрос без собственного фоллбэка; остальные два гасятся сами. */
    const arrangeCards = (cards: unknown) =>
      mocks.httpGet.mockImplementation((endpoint: string) =>
        endpoint.includes('/books/cards')
          ? cards instanceof Error
            ? Promise.reject(cards)
            : Promise.resolve(cards)
          : Promise.reject(notFoundError())
      );

    it('путь «API ответил 404»: 308 ведёт на первую страницу преемника', async () => {
      arrangeCards(notFoundError());
      mocks.resolveRetiredSlug.mockResolvedValue('hudozhestvennaya-literatura');

      await expect(run('priklyucheniya', '9')).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.resolveRetiredSlug).toHaveBeenCalledWith('category', 'ru', 'priklyucheniya');
      expect(mocks.permanentRedirect).toHaveBeenCalledWith(
        `/ru/${segment}/hudozhestvennaya-literatura`
      );
    });

    it('путь «термина нет в ответе»: 308 ведёт на первую страницу преемника', async () => {
      arrangeCards({
        category: null,
        items: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
      mocks.resolveRetiredSlug.mockResolvedValue('hudozhestvennaya-literatura');

      await expect(run('priklyucheniya', '9')).rejects.toThrow('NEXT_REDIRECT');

      expect(mocks.permanentRedirect).toHaveBeenCalledWith(
        `/ru/${segment}/hudozhestvennaya-literatura`
      );
    });
  });
}
