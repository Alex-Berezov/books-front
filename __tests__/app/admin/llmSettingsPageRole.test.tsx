import { describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '@/lib/auth/helpers';

/**
 * F05-1s, U6: экран тратит деньги — только `admin`. Layout админки пускает `content_manager`
 * и юриста, скрытый пункт меню прямую ссылку не закрывает: отказ даёт сама страница.
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
vi.mock('@/components/admin/llm-settings/LlmSettings/LlmSettings', () => ({
  LlmSettings: () => null,
}));

const { default: LlmSettingsPage } = await import('@/app/admin/[lang]/llm-settings/page');
const { LlmSettings } = await import('@/components/admin/llm-settings/LlmSettings/LlmSettings');

const run = () => LlmSettingsPage({ params: Promise.resolve({ lang: 'ru' }) } as never);

describe('страница LLM settings и роль (F05-1s)', () => {
  it.each([[['content_manager']], [['lawyer']], [['content_manager', 'lawyer']]])(
    'роли %j — на 403',
    async (roles) => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles } } as never);

      await expect(run()).rejects.toThrow('redirect:/ru/403');
    }
  );

  it.each([[null], [{}], [{ user: {} }]])('сессия %j — на 403, а не падение', async (session) => {
    vi.mocked(getCurrentUser).mockResolvedValue(session as never);

    await expect(run()).rejects.toThrow('redirect:/ru/403');
  });

  it('неизвестный язык — 404, адрес отказа из сегмента не собирается', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['user'] } } as never);

    await expect(
      LlmSettingsPage({ params: Promise.resolve({ lang: '%2F%2Fevil.example' }) } as never)
    ).rejects.toThrow('notFound');
  });

  it('администратор видит экран', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { roles: ['admin'] } } as never);

    const element = (await run()) as { type: unknown };
    expect(element.type).toBe(LlmSettings);
  });
});
