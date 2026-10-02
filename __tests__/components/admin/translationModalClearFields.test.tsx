import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryTranslationsModal } from '@/components/admin/categories/CategoryTranslationsModal/CategoryTranslationsModal';
import { TagTranslationsModal } from '@/components/admin/tags/TagTranslationsModal/TagTranslationsModal';
import type { Category, CategoryTranslation, Tag, TagTranslation } from '@/types/api-schema';

// `LEGACY-430`, `T87`: бэкенд очищает колонку только по `null`, а `undefined` не трогает.
// Модалки обязаны слать `null` на пустых `h1`, `metaTitle`, `ogTitle`, `ogImageAlt` и `faq`.

const { spies, lists, emptyForm, submitted } = vi.hoisted(() => {
  const state = {
    spies: {
      tagCreate: vi.fn((_v: unknown) => Promise.resolve({})),
      tagUpdate: vi.fn((_v: unknown) => Promise.resolve({})),
      catCreate: vi.fn((_v: unknown) => Promise.resolve({})),
      catUpdate: vi.fn((_v: unknown) => Promise.resolve({})),
    },
    lists: { tag: [] as unknown[], category: [] as unknown[] },
    // Оператор стёр все пять полей: форма отдаёт пустые строки и пустой список FAQ.
    emptyForm: {
      language: 'en',
      name: 'Classics',
      slug: 'classics',
      description: '',
      h1: '',
      shortDescription: '',
      faq: [],
      relatedCategorySlugs: '',
      relatedCollectionSlugs: '',
      relatedTagSlugs: '',
      relatedGenreSlugs: '',
      seoMetaTitle: '',
      seoMetaDescription: '',
      seoCanonicalUrl: '',
      seoRobots: '',
      seoOgTitle: '',
      seoOgDescription: '',
      seoOgImageUrl: '',
      seoOgImageAlt: '',
      seoTwitterCard: '',
      indexable: true,
    },
  };
  return { ...state, submitted: { current: state.emptyForm as Record<string, unknown> } };
});

vi.mock('notistack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('notistack')>();
  return { ...actual, useSnackbar: () => ({ enqueueSnackbar: vi.fn(), closeSnackbar: vi.fn() }) };
});

vi.mock('@/api/hooks/useTags', () => ({
  useTagTranslations: () => ({ data: { items: lists.tag }, isLoading: false }),
  useCreateTagTranslation: () => ({ mutateAsync: spies.tagCreate, isPending: false }),
  useUpdateTagTranslation: () => ({ mutateAsync: spies.tagUpdate, isPending: false }),
  useDeleteTagTranslation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCategoryTranslations: () => ({ data: { items: lists.category }, isLoading: false }),
  useCreateCategoryTranslation: () => ({ mutateAsync: spies.catCreate, isPending: false }),
  useUpdateCategoryTranslation: () => ({ mutateAsync: spies.catUpdate, isPending: false }),
  useDeleteCategoryTranslation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/components/admin/tags/TagTranslationsModal/TranslationForm', async () => {
  const { createElement } = await import('react');
  return {
    TranslationForm: (props: { onSubmit: (data: unknown) => Promise<void> }) =>
      createElement(
        'button',
        { type: 'button', onClick: () => void props.onSubmit(submitted.current) },
        'submit-stub'
      ),
  };
});

vi.mock('@/components/admin/categories/CategoryTranslationsModal/TranslationForm', async () => {
  const { createElement } = await import('react');
  return {
    TranslationForm: (props: { onSubmit: (data: unknown) => Promise<void> }) =>
      createElement(
        'button',
        { type: 'button', onClick: () => void props.onSubmit(submitted.current) },
        'submit-stub'
      ),
  };
});

const CLEARED = { h1: null, metaTitle: null, ogTitle: null, ogImageAlt: null, faq: null };

const payloadOf = (spy: (v: unknown) => unknown) =>
  (vi.mocked(spy).mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;

const openEdit = () => {
  const row = screen.getByText('classics').parentElement?.parentElement as HTMLElement;
  fireEvent.click(row.querySelectorAll('button')[0] as HTMLButtonElement);
};

describe('очистка полей перевода из админки (LEGACY-430, T87)', () => {
  beforeEach(() => {
    Object.values(spies).forEach((s) => s.mockClear());
    lists.tag = [];
    lists.category = [];
    submitted.current = emptyForm;
  });

  it('тег, создание: пустые поля уходят null, а не undefined', async () => {
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1' } as Tag} />);
    fireEvent.click(screen.getByRole('button', { name: /add translation/i }));
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.tagCreate).toHaveBeenCalledTimes(1));
    const data = payloadOf(spies.tagCreate);
    expect(data).toMatchObject(CLEARED);
    for (const key of Object.keys(CLEARED)) expect(data[key]).toBeNull();
  });

  it('тег, правка: стёртые поля уходят null', async () => {
    lists.tag = [{ language: 'en', name: 'Classics', slug: 'classics' } as TagTranslation];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1' } as Tag} />);
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.tagUpdate).toHaveBeenCalledTimes(1));
    expect(payloadOf(spies.tagUpdate)).toMatchObject(CLEARED);
  });

  it('категория, создание: пустые поля уходят null', async () => {
    render(
      <CategoryTranslationsModal isOpen onClose={vi.fn()} category={{ id: 'c1' } as Category} />
    );
    fireEvent.click(screen.getByRole('button', { name: /add translation/i }));
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.catCreate).toHaveBeenCalledTimes(1));
    expect(payloadOf(spies.catCreate)).toMatchObject(CLEARED);
  });

  it('категория, правка: стёртые поля уходят null', async () => {
    lists.category = [
      { language: 'en', name: 'Classics', slug: 'classics' } as CategoryTranslation,
    ];
    render(
      <CategoryTranslationsModal isOpen onClose={vi.fn()} category={{ id: 'c1' } as Category} />
    );
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.catUpdate).toHaveBeenCalledTimes(1));
    expect(payloadOf(spies.catUpdate)).toMatchObject(CLEARED);
  });

  // Контроль другой ветки `|| null`: заполненное поле уходит значением, а не `null`.
  it('тег, правка: заполненные поля уходят значениями', async () => {
    const faq = [{ question: 'Q', answer: 'A' }];
    submitted.current = {
      ...emptyForm,
      h1: 'H1',
      seoMetaTitle: 'Meta',
      seoOgTitle: 'OG',
      seoOgImageAlt: 'Alt',
      faq,
    };
    lists.tag = [{ language: 'en', name: 'Classics', slug: 'classics' } as TagTranslation];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1' } as Tag} />);
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.tagUpdate).toHaveBeenCalledTimes(1));
    expect(payloadOf(spies.tagUpdate)).toMatchObject({
      h1: 'H1',
      metaTitle: 'Meta',
      ogTitle: 'OG',
      ogImageAlt: 'Alt',
      faq,
    });
  });
});
