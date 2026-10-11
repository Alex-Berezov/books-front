import { describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '@/lib/auth/helpers';

/**
 * `LEGACY-466`: layout админки видит то, чего middleware по старой куке ещё не знал, — refresh,
 * отвергнутый прямо на этом запросе (`auth()` прогоняет колбэк `jwt`). Такую сессию он не пускает.
 */

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound');
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`);
  }),
}));
vi.mock('@/lib/auth/helpers', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@ant-design/nextjs-registry', () => ({ AntdRegistry: () => null }));
vi.mock('@/components/admin/AdminShell/AdminChrome/AdminChrome', () => ({
  AdminChrome: () => null,
}));
vi.mock('@/components/admin/AdminShell/AdminSidebar/AdminSidebar', () => ({
  AdminSidebar: () => null,
}));
vi.mock('@/components/admin/AdminShell/AdminTopBar/AdminTopBar', () => ({
  AdminTopBar: () => null,
}));
vi.mock('@/app/admin/[lang]/AdminThemeProvider', () => ({ AdminThemeProvider: () => null }));

const { default: AdminLayout } = await import('@/app/admin/[lang]/layout');

const run = () => AdminLayout({ children: null, params: Promise.resolve({ lang: 'ru' }) } as never);

describe('layout админки и мёртвая сессия (LEGACY-466)', () => {
  it.each(['SessionEnded', 'AccountDisabled'])(
    'сессия с ролью и %s — на вход с причиной',
    async (error) => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['admin'] }, error } as never);

      await expect(run()).rejects.toThrow(
        `redirect:/ru/auth/sign-in?callbackUrl=/admin/ru&reason=${error}`
      );
    }
  );

  it('живая сессия администратора проходит', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['admin'] } } as never);

    await expect(run()).resolves.toBeTruthy();
  });
});
