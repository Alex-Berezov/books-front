import { describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '@/lib/auth/helpers';

/**
 * Экран перевода версии запускает платный перевод — только `admin`. Layout админки пускает
 * `content_manager` и юриста, кнопка в шапке версии прямую ссылку не закрывает: отказ даёт страница.
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
vi.mock('@/components/admin/translation-run', () => ({
  TranslationRunScreen: () => null,
}));

const { default: TranslationPage } =
  await import('@/app/admin/[lang]/books/versions/[id]/translation/page');
const { TranslationRunScreen } = await import('@/components/admin/translation-run');

const run = (lang = 'ru') =>
  TranslationPage({ params: Promise.resolve({ lang, id: 'v1' }) } as never);

describe('экран перевода версии и роль', () => {
  it.each([[['content_manager']], [['lawyer']], [['user']]])('роли %j — на 403', async (roles) => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles } } as never);

    await expect(run()).rejects.toThrow('redirect:/ru/403');
  });

  it.each([[null], [{ user: {} }]])('сессия %j — на 403, а не падение', async (session) => {
    vi.mocked(getCurrentUser).mockResolvedValue(session as never);

    await expect(run()).rejects.toThrow('redirect:/ru/403');
  });

  it('неизвестный язык — 404', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['admin'] } } as never);

    await expect(run('%2F%2Fevil.example')).rejects.toThrow('notFound');
  });

  it('администратор видит экран своей версии', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['admin'] } } as never);

    const element = (await run()) as { type: unknown; props: { versionId: string; lang: string } };
    expect(element.type).toBe(TranslationRunScreen);
    expect(element.props).toEqual({ versionId: 'v1', lang: 'ru' });
  });
});
