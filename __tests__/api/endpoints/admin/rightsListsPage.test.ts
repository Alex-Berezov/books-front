import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getBookRightsClaims, getVersionRightsClaims } from '@/api/endpoints/admin/rights-claims';
import { getProfileLicenses } from '@/api/endpoints/admin/rights-licenses';
import { API_MAX_PAGE_SIZE } from '@/lib/http.constants';

const mocks = vi.hoisted(() => ({ httpGetAuth: vi.fn() }));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/http-client');
  return { ...actual, httpGetAuth: mocks.httpGetAuth };
});

/** LEGACY-377: списки прав просят страницу по потолку и получают честный `total`. */
describe('paged rights lists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for the first page at the backend ceiling and keeps the reported total', async () => {
    mocks.httpGetAuth.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: API_MAX_PAGE_SIZE, total: 250, totalPages: 3 },
    });

    const result = await getVersionRightsClaims('version-1');

    expect(mocks.httpGetAuth).toHaveBeenCalledWith(
      `/admin/versions/version-1/rights-claims?page=1&limit=${API_MAX_PAGE_SIZE}`,
      { requireAuth: true }
    );
    expect(result.pagination.total).toBe(250);
  });

  it.each([
    [
      'getBookRightsClaims',
      () => getBookRightsClaims('book-1'),
      '/admin/books/book-1/rights-claims',
    ],
    [
      'getProfileLicenses',
      () => getProfileLicenses('profile-1'),
      '/admin/rights/profiles/profile-1/licenses',
    ],
  ])('%s asks for the first page at the backend ceiling', async (_name, call, path) => {
    mocks.httpGetAuth.mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: API_MAX_PAGE_SIZE, total: 0, totalPages: 0 },
    });

    await call();

    expect(mocks.httpGetAuth).toHaveBeenCalledTimes(1);
    expect(mocks.httpGetAuth).toHaveBeenCalledWith(`${path}?page=1&limit=${API_MAX_PAGE_SIZE}`, {
      requireAuth: true,
    });
  });
});
