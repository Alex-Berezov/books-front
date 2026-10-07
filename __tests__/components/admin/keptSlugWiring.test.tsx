import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryModal } from '@/components/admin/categories/CategoryModal';
import { TranslationForm as CategoryTranslationForm } from '@/components/admin/categories/CategoryTranslationsModal/TranslationForm';
import { PageForm } from '@/components/admin/pages/PageForm';
import { TagModal } from '@/components/admin/tags/TagModal';
import { SLUG_MAX_LENGTH } from '@/lib/utils/slug';
import type { Category, PageResponse, Tag } from '@/types/api-schema';

const mocks = vi.hoisted(() => ({
  updateTag: vi.fn(),
  updateCategory: vi.fn(),
  checkSlug: vi.fn(),
}));

vi.mock('@/api/hooks/useTags', () => ({
  useCreateTag: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTag: () => ({ mutateAsync: mocks.updateTag, isPending: false }),
}));

vi.mock('@/api/hooks/usePages', () => ({
  usePageGroup: () => ({ data: undefined, isLoading: false }),
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCreateCategory: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateCategory: () => ({ mutateAsync: mocks.updateCategory, isPending: false }),
  useCategoriesTree: () => ({
    data: { items: [], pagination: { page: 1, limit: 0, total: 0, totalPages: 0 } },
  }),
}));

vi.mock('@/api/endpoints/slug-validation', () => ({
  checkTagSlugUniqueness: mocks.checkSlug,
  checkPageSlugUniqueness: mocks.checkSlug,
  checkCategorySlugUniqueness: mocks.checkSlug,
}));

// Выбор картинки тянет react-query; к слагу он отношения не имеет.
vi.mock('@/components/admin/media/MediaSelectModal', () => ({ MediaSelectModal: () => null }));

const longSlug = 'a'.repeat(SLUG_MAX_LENGTH + 1);

// Пауза проверки слага в поле - 500 мс: ждём заведомо дольше, прежде чем сказать «не звали».
const afterSlugCheckDelay = () => new Promise((resolve) => setTimeout(resolve, 700));

/**
 * LEGACY-437. Форма правки старой записи с неизменным слагом длиннее предела обязана сохраняться, и поле
 * слага не шлёт его в `check-slug` (там 400 и «не удалось проверить»): исходный слаг получают и схема,
 * и `SlugInput`. Без этой передачи схемы (`slugMaxLengthSchemas.test.ts`) зелёные, а форма ломается.
 */
describe('forms hand the stored slug to the length rule (LEGACY-437)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateTag.mockResolvedValue({});
    mocks.checkSlug.mockResolvedValue({ isUnique: true });
  });

  it('TagModal saves an untouched slug longer than the limit', async () => {
    const tag = {
      id: 'tag-1',
      key: 'aestheticism',
      slug: longSlug,
      name: 'Aestheticism',
      language: 'en',
      indexable: true,
      isVisible: true,
      sortOrder: 0,
    } as unknown as Tag;

    render(<TagModal isOpen lang="en" onClose={vi.fn()} tag={tag} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.updateTag).toHaveBeenCalled());
    expect(screen.queryByText('Slug is too long')).not.toBeInTheDocument();
    await afterSlugCheckDelay();
    expect(mocks.checkSlug).not.toHaveBeenCalled();
  });

  it('CategoryModal saves an untouched slug longer than the limit without checking it', async () => {
    mocks.updateCategory.mockResolvedValue({});
    const category = {
      id: 'cat-1',
      key: 'victorian-literature',
      slug: longSlug,
      name: 'Victorian literature',
      type: 'category',
      language: 'en',
      parentId: null,
      isVisible: true,
      indexable: true,
      autoIndexable: true,
      langBookCount: 6,
    } as unknown as Category;

    render(<CategoryModal isOpen onClose={vi.fn()} category={category} type="category" />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await waitFor(() => expect(mocks.updateCategory).toHaveBeenCalled());
    await afterSlugCheckDelay();
    // Ни поле, ни ручная проверка в `onSubmit`.
    expect(mocks.checkSlug).not.toHaveBeenCalled();
  });

  it('category translation form saves an untouched slug longer than the limit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CategoryTranslationForm
        availableLanguages={[{ value: 'en', label: 'English' }]}
        editingLang="en"
        initialData={{
          language: 'en',
          name: 'Victorian literature',
          slug: longSlug,
          description: '',
          h1: '',
          shortDescription: '',
          faq: [],
          seoMetaTitle: '',
          seoMetaDescription: '',
          seoCanonicalUrl: '',
          seoRobots: 'index, follow',
          seoOgTitle: '',
          seoOgDescription: '',
          seoOgImageUrl: '',
          seoOgImageAlt: '',
          seoTwitterCard: 'summary',
        }}
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        routeBase="category"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it('PageForm saves an untouched slug longer than the limit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const page = {
      id: 'page-1',
      language: 'en',
      type: 'generic',
      title: 'About',
      slug: longSlug,
      content: '<p>Text</p>',
      faq: [],
    } as unknown as PageResponse;

    render(<PageForm initialData={page} lang="en" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Update Page' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    await afterSlugCheckDelay();
    expect(mocks.checkSlug).not.toHaveBeenCalled();
  });
});
