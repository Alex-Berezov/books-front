import { describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '@/lib/auth/helpers';

/**
 * F05-3, U6: сравнение моделей тратит деньги — только `admin`. Layout админки пускает
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
vi.mock('@/components/admin/translation-compare/TranslationCompare/TranslationCompare', () => ({
  TranslationCompare: () => null,
}));

const { default: TranslationComparePage } =
  await import('@/app/admin/[lang]/books/versions/[id]/translation-compare/page');
const { TranslationCompare } =
  await import('@/components/admin/translation-compare/TranslationCompare/TranslationCompare');

const run = (lang = 'ru') =>
  TranslationComparePage({ params: Promise.resolve({ lang, id: 'v1' }) } as never);

describe('страница сравнения моделей и роль (F05-3)', () => {
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

    const element = (await run()) as { type: unknown; props: { versionId: string } };
    expect(element.type).toBe(TranslationCompare);
    expect(element.props.versionId).toBe('v1');
  });
});
