import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRetiredSlug } from '@/lib/seo/retired-slug';

const mocks = vi.hoisted(() => ({ httpGet: vi.fn() }));

vi.mock('@/lib/http', async () => {
  const actual = await vi.importActual<typeof import('@/lib/http')>('@/lib/http');
  return { ...actual, httpGet: mocks.httpGet };
});

/**
 * LEGACY-062. Страница таксономии, не нашедшая термин, обязана сначала спросить
 * историю слагов: переименование должно давать 308 на новый адрес, а не 404,
 * теряющий накопленные поисковые сигналы.
 */
describe('resolveRetiredSlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the current slug for a retired one', async () => {
    mocks.httpGet.mockResolvedValue({ newSlug: 'new-slug' });

    const result = await resolveRetiredSlug('category', 'en', 'old-slug');

    expect(result).toBe('new-slug');
    const endpoint = mocks.httpGet.mock.calls[0][0] as string;
    expect(endpoint).toContain('/en/slug-redirect');
    expect(endpoint).toContain('entityType=category');
    expect(endpoint).toContain('slug=old-slug');
  });

  it('returns null when nothing was retired under that slug', async () => {
    mocks.httpGet.mockResolvedValue({ newSlug: null });
    expect(await resolveRetiredSlug('category', 'en', 'never-existed')).toBeNull();
  });

  // 🔴 Отказ запроса не должен превращать честный 404 в 5xx: страница и так уже не
  // нашлась, и единственная потеря — редирект, которого могло и не быть.
  it('degrades to null when the lookup itself fails', async () => {
    mocks.httpGet.mockRejectedValue(new Error('socket hang up'));
    await expect(resolveRetiredSlug('category', 'ru', 'any')).resolves.toBeNull();
  });

  it('survives a malformed answer', async () => {
    mocks.httpGet.mockResolvedValue(undefined);
    await expect(resolveRetiredSlug('tag', 'fr', 'any')).resolves.toBeNull();
  });

  it('does not call the API for an empty slug', async () => {
    expect(await resolveRetiredSlug('category', 'en', '')).toBeNull();
    expect(mocks.httpGet).not.toHaveBeenCalled();
  });

  it('keeps languages apart in the request', async () => {
    mocks.httpGet.mockResolvedValue({ newSlug: 'x' });
    await resolveRetiredSlug('tag', 'pt', 'old');
    expect(mocks.httpGet.mock.calls[0][0] as string).toContain('/pt/slug-redirect');
  });
});
