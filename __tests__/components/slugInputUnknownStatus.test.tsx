import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SlugInput } from '@/components/common/SlugInput/SlugInput';

const hookResult = {
  existingItem: null as unknown,
  isUnique: undefined as boolean | undefined,
  reserved: undefined as boolean | undefined,
  status: 'unknown',
  suggestedSlug: undefined as string | undefined,
  validate: vi.fn(),
};

vi.mock('@/lib/hooks/useSlugValidation', () => ({
  useSlugValidation: () => hookResult,
}));

/**
 * LEGACY-142. Отказ проверки уникальности показывается как неизвестность:
 * ни зелёного вердикта, ни блокировки сохранения. Здесь закреплены три вещи,
 * которые легко потерять при следующей правке компонента.
 */
describe('SlugInput — the uniqueness check could not answer', () => {
  beforeEach(() => {
    hookResult.existingItem = null;
    hookResult.isUnique = undefined;
    hookResult.reserved = undefined;
    hookResult.status = 'unknown';
    hookResult.suggestedSlug = undefined;
  });

  it('says the check did not happen instead of showing a green verdict', () => {
    render(<SlugInput entityType="tag" mode="create" onChange={vi.fn()} value="aestheticism" />);

    expect(screen.getByText(/could not verify slug uniqueness/i)).toBeInTheDocument();
    // Никакого «занято»: неизвестность - это не дубль.
    expect(screen.queryByText(/already taken/i)).not.toBeInTheDocument();
  });

  // 🔴 Проверка запускается только на слаге, прошедшем `isValidSlug`, а хук
  // возвращается в `idle` только на пустом слаге. Без привязки к текущему
  // значению вердикт переживал бы значение, о котором он был: редактор дописывает
  // дефис, запрос не уходит, а на экране висит ответ про прежний слаг - и подсказка
  // о формате спрятана ровно тогда, когда она нужнее всего.
  it('drops the stale answer once the field holds a value nobody checked', () => {
    render(<SlugInput entityType="tag" mode="create" onChange={vi.fn()} value="my-slug-" />);

    expect(screen.queryByText(/could not verify slug uniqueness/i)).not.toBeInTheDocument();
    expect(screen.getByText(/URL-friendly identifier/i)).toBeInTheDocument();
  });

  it('keeps quiet next to the reserved-slug warning, which says the opposite', () => {
    render(
      <SlugInput entityType="page" lang="en" mode="create" onChange={vi.fn()} value="catalog" />
    );

    expect(screen.getByText(/reserved by a site route/i)).toBeInTheDocument();
    // «You can still save» рядом с «так называть нельзя» - прямое противоречие.
    expect(screen.queryByText(/could not verify slug uniqueness/i)).not.toBeInTheDocument();
  });
});
