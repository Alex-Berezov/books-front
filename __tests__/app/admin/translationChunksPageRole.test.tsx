import { describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '@/lib/auth/helpers';

/**
 * F05-7v-b, U6: повтор куска тратит деньги — страница кусков только для `admin`. Layout
 * админки пускает `content_manager` и юриста: отказ даёт страница. Без запуска или книги
 * в адресе — 404.
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
vi.mock('@/components/admin/translation-chunks/TranslationChunks', () => ({
  TranslationChunks: () => null,
}));

const { default: TranslationChunksPage } =
  await import('@/app/admin/[lang]/books/versions/[id]/translation-chunks/page');
const { TranslationChunks } =
  await import('@/components/admin/translation-chunks/TranslationChunks');

const query = { run: 'r1', book: 'b1', language: 'es' };
const run = (lang = 'ru', search: Record<string, string | string[]> = query) =>
  TranslationChunksPage({
    params: Promise.resolve({ lang, id: 'v1' }),
    searchParams: Promise.resolve(search),
  } as never);

describe('страница кусков запуска и роль (F05-7v-b)', () => {
  it.each([[['content_manager']], [['lawyer']], [['user']]])('роли %j — на 403', async (roles) => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles } } as never);

    await expect(run()).rejects.toThrow('redirect:/ru/403');
  });

  it.each([[null], [{ user: {} }]])('сессия %j — на 403, а не падение', async (session) => {
    vi.mocked(getCurrentUser).mockResolvedValue(session as never);

    await expect(run()).rejects.toThrow('redirect:/ru/403');
  });

  it.each([
    ['неизвестный язык', '%2F%2Fevil.example', query],
    ['без запуска', 'ru', { book: 'b1' }],
    ['без книги', 'ru', { run: 'r1' }],
    ['запуск с путём', 'ru', { run: '../../users', book: 'b1' }],
    ['запуск списком', 'ru', { run: ['r1', 'r2'], book: 'b1' }],
  ])('%s — 404', async (_, lang, search) => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['admin'] } } as never);

    await expect(run(lang, search)).rejects.toThrow('notFound');
  });

  it('администратор видит экран: версия, запуск, книга и язык из адреса', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['admin'] } } as never);

    const element = (await run()) as { type: unknown; props: Record<string, unknown> };
    expect(element.type).toBe(TranslationChunks);
    expect(element.props).toMatchObject({
      versionId: 'v1',
      runId: 'r1',
      bookId: 'b1',
      language: 'es',
    });
  });
});
