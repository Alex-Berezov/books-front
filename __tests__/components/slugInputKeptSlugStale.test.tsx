import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlugInput } from '@/components/admin/common/SlugInput/SlugInput';
import { SLUG_MAX_LENGTH } from '@/lib/utils/slug';

const mocks = vi.hoisted(() => ({ httpGetAuth: vi.fn() }));

vi.mock('@/lib/http-client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/http-client');
  return { ...actual, httpGetAuth: mocks.httpGetAuth };
});

const UNKNOWN = /could not verify slug uniqueness/i;

/**
 * LEGACY-437. Хранимый слаг длиннее предела не проверяется, и вердикт о другом значении на нём
 * не остаётся: ни уже полученный, ни запоздавший ответ на проверку, ушедшую до возврата к нему.
 */
describe('SlugInput - no stale verdict on a kept slug over the limit', () => {
  const longSlug = 'a'.repeat(SLUG_MAX_LENGTH + 1);
  const props = {
    entityType: 'tag' as const,
    excludeId: 'tag-1',
    keptSlug: longSlug,
    mode: 'edit' as const,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // `check-slug` отвечает 400 на слаг длиннее предела; эндпоинт сводит отказ к «не знаю».
    mocks.httpGetAuth.mockRejectedValue(new Error('400'));
  });

  it('drops the verdict about another value when the kept slug comes back', async () => {
    const { rerender } = render(<SlugInput {...props} value="short" />);
    await waitFor(() => expect(screen.getByText(UNKNOWN)).toBeInTheDocument(), { timeout: 2000 });

    rerender(<SlugInput {...props} value={longSlug} />);

    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
  });

  it('drops a check still waiting when the edit is undone', async () => {
    const { rerender } = render(<SlugInput {...props} value={longSlug} />);
    rerender(<SlugInput {...props} value={`${longSlug}b`} />);
    rerender(<SlugInput {...props} value={longSlug} />);

    // Пауза проверки - 500 мс; ждём заведомо дольше.
    await new Promise((resolve) => setTimeout(resolve, 800));

    expect(mocks.httpGetAuth).not.toHaveBeenCalled();
    expect(screen.queryByText(UNKNOWN)).not.toBeInTheDocument();
  });

  it('checks a kept slug exactly at the limit', async () => {
    const atLimit = 'a'.repeat(SLUG_MAX_LENGTH);
    render(<SlugInput {...props} keptSlug={atLimit} value={atLimit} />);

    await waitFor(() => expect(mocks.httpGetAuth).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });
});
