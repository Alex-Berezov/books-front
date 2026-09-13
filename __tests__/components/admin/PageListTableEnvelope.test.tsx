import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Разбор формы ответа в списке CMS-страниц (`LEGACY-177`).
 *
 * Стороны выкатываются врозь: бэкенд уезжает тегом, фронт — пушем в `main`,
 * безопасного порядка у пары нет. В окне выката сюда приходит ответ одной
 * из двух форм, и ветка проверки формы — единственное, что отделяет внятный
 * отказ от белого экрана: старая обёртка `{data, meta}` развернулась бы
 * в `undefined` при чтении `data.items`.
 *
 * ⚠️ Тест кормит компонент **старой** формой намеренно. Снятие ветки вместе
 * с закрытием окна выката обязано ронять этот кейс — иначе никто не заметит,
 * что защита ушла раньше срока.
 */

const mockUsePages = vi.fn();
const mockEnqueueSnackbar = vi.fn();

vi.mock('@/api/hooks', () => ({
  usePages: (...args: unknown[]) => mockUsePages(...args) as unknown,
  useDeletePage: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mockEnqueueSnackbar }),
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { PageListTable } = await import('@/components/admin/pages/PageListTable/PageListTable');

const group = {
  translationGroupId: 'grp-1',
  pages: [
    {
      id: 'p-en',
      language: 'en',
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      status: 'published',
      updatedAt: '2026-09-01T00:00:00.000Z',
    },
  ],
};

describe('PageListTable — разбор формы списочного ответа (LEGACY-177)', () => {
  beforeEach(() => {
    mockUsePages.mockReset();
    mockEnqueueSnackbar.mockReset();
  });

  it('новая обёртка {items, pagination} рисует таблицу', () => {
    mockUsePages.mockReturnValue({
      data: { items: [group], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      error: null,
    });

    render(<PageListTable lang="en" />);

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(mockEnqueueSnackbar).not.toHaveBeenCalled();
  });

  it('старая форма {data, meta} даёт внятный отказ, а не падение', () => {
    mockUsePages.mockReturnValue({
      data: { data: [group], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isLoading: false,
      error: null,
    });

    render(<PageListTable lang="en" />);

    expect(screen.getByText(/Invalid API response format/)).toBeInTheDocument();
    expect(mockEnqueueSnackbar).toHaveBeenCalled();
  });

  it('голый массив тоже распознаётся как чужая форма', () => {
    mockUsePages.mockReturnValue({ data: [group], isLoading: false, error: null });

    render(<PageListTable lang="en" />);

    expect(screen.getByText(/Invalid API response format: array/)).toBeInTheDocument();
  });
});
