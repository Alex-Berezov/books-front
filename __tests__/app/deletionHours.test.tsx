import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeletionPage from '@/app/[lang]/deletion/page';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { contactGeneral } from '@/lib/site/owner-facts';

/**
 * Срок удаления из рабочей базы - одна константа на `/deletion` и privacy (F01-6): в словаре
 * место `{hours}`, число подставляет страница. Сырое место или старое число - расхождение
 * с политикой при смене срока.
 */
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/deletion',
}));

vi.mock('@/lib/site/owner-facts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/site/owner-facts')>()),
  retentionDeletionHours: 9006,
}));

describe('/deletion: срок удаления из константы', () => {
  it.each(SUPPORTED_LANGS)('%s', async (lang) => {
    const { container } = render(await DeletionPage({ params: Promise.resolve({ lang }) }));
    expect(container.textContent).toContain('9006');
    expect(container.textContent).not.toMatch(/\{hours\}|\b24\b/);
  });
});

/**
 * Удаление аккаунта - письмом на общий адрес (T131, слово владельца 14.10.2026): вход на сайте
 * только через Google, и страница не описывает других соцсетей.
 */
describe('/deletion: удаление письмом, без сторонних соцсетей', () => {
  it.each(SUPPORTED_LANGS)('%s', async (lang) => {
    const { container } = render(await DeletionPage({ params: Promise.resolve({ lang }) }));
    const steps = container.querySelectorAll('ol > li');
    expect(steps).toHaveLength(2);
    expect(steps[0].textContent).toContain(contactGeneral);
    expect(container.textContent).not.toMatch(/facebook/i);
  });
});
