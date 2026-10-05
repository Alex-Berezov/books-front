import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlugInput } from '@/components/common/SlugInput/SlugInput';

const mocks = vi.hoisted(() => ({ httpGetAuth: vi.fn() }));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/http-client');
  return { ...actual, httpGetAuth: mocks.httpGetAuth };
});

/**
 * Слаг языковой версии уникален в пределах языка. Форма создания версии даёт сменить язык
 * после того, как слаг уже проверен, - вердикт по прежнему языку тогда устарел, и проверка
 * обязана уйти заново с новым языком, а не оставить прежнюю зелёную галочку.
 */
describe('SlugInput - language change re-checks the slug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.httpGetAuth.mockResolvedValue({ exists: false });
  });

  it('checks the same slug again for the new language', async () => {
    const props = {
      entityType: 'bookVersion' as const,
      mode: 'create' as const,
      onChange: vi.fn(),
    };
    const { rerender } = render(<SlugInput {...props} lang="en" value="hamlet" />);

    await waitFor(() => expect(mocks.httpGetAuth).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(mocks.httpGetAuth.mock.calls[0][0] as string).toContain('lang=en');

    rerender(<SlugInput {...props} lang="fr" value="hamlet" />);

    await waitFor(() => expect(mocks.httpGetAuth).toHaveBeenCalledTimes(2), { timeout: 2000 });
    expect(mocks.httpGetAuth.mock.calls[1][0] as string).toContain('lang=fr');
  });
});
