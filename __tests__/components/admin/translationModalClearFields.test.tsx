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
  return {
    ...state,
    submitted: { current: state.emptyForm as Record<string, unknown> | null },
  };
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
    TranslationForm: (props: {
      initialData?: unknown;
      onSubmit: (data: unknown) => Promise<void>;
    }) =>
      createElement(
        'button',
        {
          type: 'button',
          // `submitted.current === null` — оператор сохраняет форму как открылась.
          onClick: () => void props.onSubmit(submitted.current ?? props.initialData),
        },
        'submit-stub'
      ),
  };
});

vi.mock('@/components/admin/categories/CategoryTranslationsModal/TranslationForm', async () => {
  const { createElement } = await import('react');
  return {
    TranslationForm: (props: {
      initialData?: unknown;
      onSubmit: (data: unknown) => Promise<void>;
    }) =>
      createElement(
        'button',
        {
          type: 'button',
          // `submitted.current === null` — оператор сохраняет форму как открылась.
          onClick: () => void props.onSubmit(submitted.current ?? props.initialData),
        },
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

// `LEGACY-430`, `T96` (решение арбитра 03.10.2026): публичный SEO-бандл и соцкарточки читают
// только `Seo`, поэтому meta/OG модалка пишет и в `Seo`, а форма читает `Seo` первым.
const SEO_FIELDS = [
  'metaTitle',
  'metaDescription',
  'ogTitle',
  'ogDescription',
  'ogImageUrl',
  'ogImageAlt',
] as const;

const filledForm = () => ({
  ...emptyForm,
  seoMetaTitle: 'Meta',
  seoMetaDescription: 'Desc',
  seoOgTitle: 'OG',
  seoOgDescription: 'OG desc',
  seoOgImageUrl: 'https://example.com/og.png',
  seoOgImageAlt: 'Alt',
});

const FILLED_SEO = {
  metaTitle: 'Meta',
  metaDescription: 'Desc',
  ogTitle: 'OG',
  ogDescription: 'OG desc',
  ogImageUrl: 'https://example.com/og.png',
  ogImageAlt: 'Alt',
};

const seoOf = (spy: (v: unknown) => unknown) => payloadOf(spy).seo as Record<string, unknown>;

describe('meta/OG перевода пишутся в Seo (LEGACY-430, T96)', () => {
  beforeEach(() => {
    Object.values(spies).forEach((s) => s.mockClear());
    lists.tag = [];
    lists.category = [];
    submitted.current = emptyForm;
  });

  it('тег, создание: заполненные meta/OG уходят в seo', async () => {
    submitted.current = filledForm();
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1' } as Tag} />);
    fireEvent.click(screen.getByRole('button', { name: /add translation/i }));
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.tagCreate).toHaveBeenCalledTimes(1));
    expect(seoOf(spies.tagCreate)).toMatchObject(FILLED_SEO);
  });

  it('категория, правка: заполненные meta/OG уходят в seo', async () => {
    submitted.current = filledForm();
    lists.category = [
      { language: 'en', name: 'Classics', slug: 'classics' } as CategoryTranslation,
    ];
    render(
      <CategoryTranslationsModal isOpen onClose={vi.fn()} category={{ id: 'c1' } as Category} />
    );
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.catUpdate).toHaveBeenCalledTimes(1));
    expect(seoOf(spies.catUpdate)).toMatchObject(FILLED_SEO);
  });

  it('тег, правка: стёртые meta/OG уходят в seo как null', async () => {
    lists.tag = [{ language: 'en', name: 'Classics', slug: 'classics' } as TagTranslation];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1' } as Tag} />);
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.tagUpdate).toHaveBeenCalledTimes(1));
    const seo = seoOf(spies.tagUpdate);
    for (const key of SEO_FIELDS) expect(seo[key]).toBeNull();
  });

  // Публика видит `Seo`: форма показывает его, а не устаревшее плоское поле, и сохранение
  // без правок не тащит плоское значение наружу.
  const STALE_FLAT = {
    metaTitle: 'flat',
    metaDescription: 'flat',
    ogTitle: 'flat',
    ogDescription: 'flat',
    ogImageUrl: 'https://example.com/flat.png',
    ogImageAlt: 'flat',
  };

  it('тег, правка: форма читает Seo раньше плоского поля', async () => {
    submitted.current = null;
    lists.tag = [
      {
        language: 'en',
        name: 'Classics',
        slug: 'classics',
        ...STALE_FLAT,
        seo: FILLED_SEO,
      } as unknown as TagTranslation,
    ];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1' } as Tag} />);
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.tagUpdate).toHaveBeenCalledTimes(1));
    expect(seoOf(spies.tagUpdate)).toMatchObject(FILLED_SEO);
    expect(payloadOf(spies.tagUpdate)).toMatchObject(FILLED_SEO);
  });

  it('категория, правка: форма читает Seo раньше плоского поля', async () => {
    submitted.current = null;
    lists.category = [
      {
        language: 'en',
        name: 'Classics',
        slug: 'classics',
        ...STALE_FLAT,
        seo: FILLED_SEO,
      } as unknown as CategoryTranslation,
    ];
    render(
      <CategoryTranslationsModal isOpen onClose={vi.fn()} category={{ id: 'c1' } as Category} />
    );
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.catUpdate).toHaveBeenCalledTimes(1));
    expect(seoOf(spies.catUpdate)).toMatchObject(FILLED_SEO);
    expect(payloadOf(spies.catUpdate)).toMatchObject(FILLED_SEO);
  });
});

describe('meta/OG перевода: откат на плоское поле и очистка у категории (LEGACY-430, T96)', () => {
  beforeEach(() => {
    Object.values(spies).forEach((s) => s.mockClear());
    lists.tag = [];
    lists.category = [];
    submitted.current = emptyForm;
  });

  // `Seo` есть, но поля в нём пусты: форма показывает плоское значение и сохраняет его в `seo`.
  const FLAT_ONLY = {
    metaTitle: 'flat title',
    metaDescription: 'flat desc',
    ogTitle: 'flat og',
    ogDescription: 'flat og desc',
    ogImageUrl: 'https://example.com/flat.png',
    ogImageAlt: 'flat alt',
  };
  const EMPTY_SEO = {
    metaTitle: null,
    metaDescription: null,
    ogTitle: null,
    ogDescription: null,
    ogImageUrl: null,
    ogImageAlt: null,
    robots: 'index, follow',
  };

  it('тег, правка: поле Seo пусто — форма берёт плоское значение', async () => {
    submitted.current = null;
    lists.tag = [
      {
        language: 'en',
        name: 'Classics',
        slug: 'classics',
        ...FLAT_ONLY,
        seo: EMPTY_SEO,
      } as unknown as TagTranslation,
    ];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1' } as Tag} />);
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.tagUpdate).toHaveBeenCalledTimes(1));
    expect(seoOf(spies.tagUpdate)).toMatchObject(FLAT_ONLY);
  });

  it('категория, правка: Seo нет — форма берёт плоское значение', async () => {
    submitted.current = null;
    lists.category = [
      {
        language: 'en',
        name: 'Classics',
        slug: 'classics',
        ...FLAT_ONLY,
        seo: null,
      } as unknown as CategoryTranslation,
    ];
    render(
      <CategoryTranslationsModal isOpen onClose={vi.fn()} category={{ id: 'c1' } as Category} />
    );
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.catUpdate).toHaveBeenCalledTimes(1));
    expect(seoOf(spies.catUpdate)).toMatchObject(FLAT_ONLY);
  });

  it('категория, правка: стёртые meta/OG уходят в seo как null', async () => {
    lists.category = [
      { language: 'en', name: 'Classics', slug: 'classics' } as CategoryTranslation,
    ];
    render(
      <CategoryTranslationsModal isOpen onClose={vi.fn()} category={{ id: 'c1' } as Category} />
    );
    openEdit();
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.catUpdate).toHaveBeenCalledTimes(1));
    const seo = seoOf(spies.catUpdate);
    for (const key of SEO_FIELDS) expect(seo[key]).toBeNull();
  });

  it('категория, создание: заполненные meta/OG уходят в seo', async () => {
    submitted.current = filledForm();
    render(
      <CategoryTranslationsModal isOpen onClose={vi.fn()} category={{ id: 'c1' } as Category} />
    );
    fireEvent.click(screen.getByRole('button', { name: /add translation/i }));
    fireEvent.click(screen.getByText('submit-stub'));
    await waitFor(() => expect(spies.catCreate).toHaveBeenCalledTimes(1));
    expect(seoOf(spies.catCreate)).toMatchObject(FILLED_SEO);
  });
});
