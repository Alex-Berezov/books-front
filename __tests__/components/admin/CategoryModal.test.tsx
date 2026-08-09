import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryModal } from '@/components/admin/categories/CategoryModal';
import type { Category } from '@/types/api-schema';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  create: vi.fn(),
  checkSlug: vi.fn(),
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCreateCategory: () => ({ mutateAsync: mocks.create, isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: mocks.update, isPending: false }),
  useCategoriesTree: () => ({ data: [] }),
}));

vi.mock('@/api/endpoints/slug-validation', () => ({
  checkCategorySlugUniqueness: mocks.checkSlug,
}));

const category = {
  id: 'cat-1',
  key: 'victorian-literature',
  slug: 'victorian-literature',
  name: 'Victorian literature',
  type: 'category',
  language: 'en',
  parentId: null,
  isVisible: true,
  indexable: true,
  autoIndexable: true,
  langBookCount: 6,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
} as unknown as Category;

const renderModal = (overrides: Partial<Category> = {}) =>
  render(
    <CategoryModal
      isOpen
      onClose={vi.fn()}
      category={{ ...category, ...overrides }}
      type="category"
    />
  );

describe('CategoryModal — editorial visibility switches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkSlug.mockResolvedValue({ isUnique: true });
    mocks.update.mockResolvedValue({});
  });

  it('sends both editorial flags on save', async () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Visible'));
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    const payload = mocks.update.mock.calls[0][0] as {
      id: string;
      data: Record<string, unknown>;
    };
    expect(payload.id).toBe('cat-1');
    expect(payload.data.isVisible).toBe(false);
    expect(payload.data.indexable).toBe(true);
  });

  // 🔴 Переписано 09.08.2026. Раньше здесь закреплялось, что `slug` в тело PATCH **не
  // попадает** — это было верно, пока поле слага было заперто (редиректов не
  // существовало, и правка молча удаляла проиндексированный URL). С появлением
  // `SlugRedirect` поле разблокировано, и слаг обязан отправляться.
  //
  // Инвариант при этом сохранился и стал важнее: `key` идёт **всегда и явно**. В
  // сервисе ветка `dto.key ?? dto.slug` делает слаг ключом, когда `key` не пришёл
  // (LEGACY-068). Пока слаг не отправлялся, ловушка была недостижима — теперь её
  // держит только это поле.
  it('sends the slug, and always sends key explicitly with it (LEGACY-068)', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    const payload = mocks.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(payload.data.slug).toBe('victorian-literature');
    expect(payload.data.key).toBe('victorian-literature');
  });

  it('tells the editor what the page will answer after saving', async () => {
    renderModal();
    expect(screen.getByText(/indexed/)).toBeInTheDocument();

    // Снятая галочка меняет ответ немедленно: строка описывает будущее состояние,
    // а не сохранённое — иначе она устаревает ровно в момент, когда её читают.
    fireEvent.click(screen.getByLabelText('Visible'));
    await waitFor(() => expect(screen.getByText(/hidden/)).toBeInTheDocument());
  });

  it('does not promise indexing it cannot deliver for a term the rule keeps closed', async () => {
    renderModal({ autoIndexable: false, langBookCount: 3 });

    // Обе галочки в «разрешено», а страница всё равно вне индекса.
    expect(screen.getByText(/auto: closed/)).toBeInTheDocument();
  });
});
