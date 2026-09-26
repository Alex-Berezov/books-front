import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoryTranslationsModal } from '@/components/admin/categories/CategoryTranslationsModal/CategoryTranslationsModal';
import { TagTranslationsModal } from '@/components/admin/tags/TagTranslationsModal/TagTranslationsModal';
import { ApiError } from '@/types/api';
import type { Category, Tag } from '@/types/api-schema';

const { errorSpy, rejectWith, mutation, emptyList, stubForm } = vi.hoisted(() => {
  const rejectWith = { current: null as unknown };
  return {
    errorSpy: vi.fn(),
    rejectWith,
    mutation: () => ({
      mutateAsync: vi.fn(() => Promise.reject(rejectWith.current)),
      isPending: false,
    }),
    emptyList: () => ({ data: { items: [] }, isLoading: false }),
    // Форма целиком здесь не нужна: заглушка отдаёт в onSubmit те же данные, что пришли в initialData.
    stubForm: async () => {
      const { createElement } = await import('react');
      return {
        TranslationForm: (props: {
          initialData: unknown;
          onSubmit: (data: unknown) => Promise<void>;
        }) =>
          createElement(
            'button',
            { type: 'button', onClick: () => void props.onSubmit(props.initialData) },
            'submit-stub'
          ),
      };
    },
  };
});

vi.mock('notistack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('notistack')>();
  return { ...actual, useSnackbar: () => ({ enqueueSnackbar: errorSpy, closeSnackbar: vi.fn() }) };
});

vi.mock('@/api/hooks/useTags', () => ({
  useTagTranslations: emptyList,
  useCreateTagTranslation: mutation,
  useUpdateTagTranslation: mutation,
  useDeleteTagTranslation: mutation,
}));

vi.mock('@/api/hooks/useCategories', () => ({
  useCategoryTranslations: emptyList,
  useCreateCategoryTranslation: mutation,
  useUpdateCategoryTranslation: mutation,
  useDeleteCategoryTranslation: mutation,
}));

vi.mock('@/components/admin/tags/TagTranslationsModal/TranslationForm', () => stubForm());
vi.mock('@/components/admin/categories/CategoryTranslationsModal/TranslationForm', () =>
  stubForm()
);

// LEGACY-419: предел FAQ на бэкенде даёт 400, глобальный тост 4xx не показывает — модалка обязана сказать сама.
describe('translation modals report a rejected save (LEGACY-419)', () => {
  const SERVER_MESSAGE = 'faq.0.answer must be shorter than or equal to 10000 characters';

  beforeEach(() => {
    errorSpy.mockClear();
    rejectWith.current = new ApiError({
      statusCode: 400,
      message: SERVER_MESSAGE,
      error: 'Bad Request',
    });
  });

  const MODALS = [
    [
      'tag',
      () => (
        <TagTranslationsModal isOpen onClose={vi.fn()} tag={{ id: 't1', name: 'Tag' } as Tag} />
      ),
    ],
    [
      'category',
      () => (
        <CategoryTranslationsModal
          isOpen
          onClose={vi.fn()}
          category={{ id: 'c1', name: 'Cat' } as Category}
        />
      ),
    ],
  ] as const;

  const submit = (renderModal: () => ReactElement) => {
    render(renderModal());
    fireEvent.click(screen.getByRole('button', { name: /add translation/i }));
    fireEvent.click(screen.getByRole('button', { name: 'submit-stub' }));
  };

  it.each(MODALS)('%s modal shows the server message on 400', async (_name, renderModal) => {
    submit(renderModal);

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith(SERVER_MESSAGE, { variant: 'error' })
    );
  });

  // 5xx показывает глобальный тост (AppProviders, MutationCache.onError) — второе сообщение не нужно.
  it.each(MODALS)('%s modal leaves 5xx to the global toast', async (_name, renderModal) => {
    rejectWith.current = new ApiError({ statusCode: 500, message: 'boom', error: 'Internal' });
    submit(renderModal);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
