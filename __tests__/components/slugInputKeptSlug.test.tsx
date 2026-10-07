import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlugInput } from '@/components/common/SlugInput/SlugInput';

const validate = vi.fn();
const verdict = vi.hoisted(() => ({
  current: {
    existingItem: null as unknown,
    isUnique: undefined as boolean | undefined,
    reserved: undefined as boolean | undefined,
    status: 'idle',
  },
}));

vi.mock('@/lib/hooks/useSlugValidation', () => ({
  useSlugValidation: () => ({
    ...verdict.current,
    suggestedSlug: undefined,
    validate,
  }),
}));

/**
 * LEGACY-437. Сохранённый слаг длиннее предела сервер принимает неизменным, а `check-slug` отвечает
 * на него 400: форма правки старой записи показывала «не удалось проверить» на нетронутом поле.
 */
describe('SlugInput — stored slug over the limit', () => {
  const longSlug = 'a'.repeat(101);

  beforeEach(() => {
    validate.mockClear();
    verdict.current = {
      existingItem: null,
      isUnique: undefined,
      reserved: undefined,
      status: 'idle',
    };
  });

  it('does not check a kept slug longer than the limit', () => {
    render(
      <SlugInput
        entityType="tag"
        keptSlug={longSlug}
        mode="edit"
        onChange={vi.fn()}
        value={longSlug}
      />
    );

    // Пустой слаг ничего не проверяет: он только гасит проверку, ещё ждущую своей очереди.
    expect(validate).not.toHaveBeenCalledWith(longSlug);
  });

  it('still checks a kept slug within the limit', () => {
    render(
      <SlugInput
        entityType="tag"
        keptSlug="aesthetics"
        mode="edit"
        onChange={vi.fn()}
        value="aesthetics"
      />
    );

    expect(validate).toHaveBeenCalledWith('aesthetics');
  });

  it('still checks a changed slug, even when the kept one is long', () => {
    render(
      <SlugInput
        entityType="tag"
        keptSlug={longSlug}
        mode="edit"
        onChange={vi.fn()}
        value="aesthetics"
      />
    );

    expect(validate).toHaveBeenCalledWith('aesthetics');
  });

  // Вердикт хука остался от другого значения: на хранимом длинном слаге он не показывается.
  it('shows no stale duplicate, reserved or status verdict on a kept slug over the limit', () => {
    verdict.current = {
      existingItem: { id: 'page-2', title: 'Other', slug: 'other' },
      isUnique: false,
      reserved: true,
      status: 'invalid',
    };

    render(
      <SlugInput
        entityType="page"
        keptSlug={longSlug}
        lang="en"
        mode="edit"
        onChange={vi.fn()}
        value={longSlug}
      />
    );

    expect(screen.queryByText(/already taken/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/reserved by a site route/i)).not.toBeInTheDocument();
  });

  it('still shows the duplicate verdict on a changed slug', () => {
    verdict.current = {
      existingItem: { id: 'page-2', title: 'Other', slug: 'other' },
      isUnique: false,
      reserved: undefined,
      status: 'invalid',
    };

    render(
      <SlugInput
        entityType="page"
        keptSlug={longSlug}
        lang="en"
        mode="edit"
        onChange={vi.fn()}
        value="other"
      />
    );

    expect(screen.getByText(/already taken/i)).toBeInTheDocument();
  });
});
