import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logError } from '@/lib/utils/log-error';
import { appendPageParam, getPageMetadata } from '@/lib/utils/seo';

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://bibliaris.com';
});

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/**
 * Первая страница обязана жить по адресу без `?page=1`: иначе у неё два адреса,
 * и canonical начинает спорить сам с собой.
 */
describe('appendPageParam', () => {
  it.each([
    ['без номера', undefined],
    ['первая страница', 1],
    ['нулевая', 0],
    ['отрицательная', -3],
  ])('не добавляет параметр — %s', (_name, page) => {
    expect(appendPageParam('/catalog', page)).toBe('/catalog');
  });

  it('добавляет параметр со второй страницы', () => {
    expect(appendPageParam('/catalog', 2)).toBe('/catalog?page=2');
  });
});

describe('getPageMetadata', () => {
  it('нормализует путь без ведущего слэша', () => {
    const withSlash = getPageMetadata('en', '/genres', 'T', 'D');
    const withoutSlash = getPageMetadata('en', 'genres', 'T', 'D');

    expect(withoutSlash.alternates?.canonical).toBe(withSlash.alternates?.canonical);
  });

  // Главная адресуется как `/:lang`, а не `/:lang/`: одиночный слэш здесь —
  // отдельная ветка, и её потеря дала бы canonical с хвостовым слэшем.
  it('корневой путь не оставляет хвостового слэша', () => {
    const meta = getPageMetadata('ru', '/', 'T', 'D');

    expect(meta.alternates?.canonical).toBe('https://bibliaris.com/ru');
  });

  it('canonical и og:url совпадают и учитывают номер страницы', () => {
    const meta = getPageMetadata('en', '/catalog', 'T', 'D', 3);

    expect(meta.alternates?.canonical).toBe('https://bibliaris.com/en/catalog?page=3');
    expect(meta.openGraph?.url).toBe(meta.alternates?.canonical);
  });

  it('перечисляет языковые альтернативы', () => {
    const meta = getPageMetadata('en', '/catalog', 'T', 'D');

    expect(Object.keys(meta.alternates?.languages ?? {}).length).toBeGreaterThan(1);
  });
});

/**
 * Проглоченная ошибка обязана оставаться видимой в разработке и молчать в
 * проде: там за логи отвечает сам развёрнутый сервис.
 */
describe('logError', () => {
  it('пишет в консоль вне продакшена', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'development');

    logError('failed to count books', new Error('boom'));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('молчит в продакшене', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');

    logError('failed to count books', new Error('boom'));

    expect(spy).not.toHaveBeenCalled();
  });
});
