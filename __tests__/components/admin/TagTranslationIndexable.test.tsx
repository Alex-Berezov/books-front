import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TagTranslationsModal } from '@/components/admin/tags/TagTranslationsModal/TagTranslationsModal';
import { TranslationForm } from '@/components/admin/tags/TagTranslationsModal/TranslationForm';
import type { TranslationFormData } from '@/components/admin/tags/TagTranslationsModal/TagTranslationsModal.types';
import type { Tag, TagTranslation } from '@/types/api-schema';

// `LEGACY-422`, `T73`: редакционный флаг `indexable` перевода тега пишется из админки.
// Бэкенд пишет его, только если поле пришло в теле, — модалка обязана его слать.

const { createSpy, updateSpy, translations } = vi.hoisted(() => ({
  createSpy: vi.fn((_vars: unknown) => Promise.resolve({})),
  updateSpy: vi.fn((_vars: unknown) => Promise.resolve({})),
  translations: { current: [] as unknown[] },
}));

vi.mock('notistack', async (importOriginal) => {
  const actual = await importOriginal<typeof import('notistack')>();
  return { ...actual, useSnackbar: () => ({ enqueueSnackbar: vi.fn(), closeSnackbar: vi.fn() }) };
});

vi.mock('@/api/hooks/useTags', () => ({
  useTagTranslations: () => ({ data: { items: translations.current }, isLoading: false }),
  useCreateTagTranslation: () => ({ mutateAsync: createSpy, isPending: false }),
  useUpdateTagTranslation: () => ({ mutateAsync: updateSpy, isPending: false }),
  useDeleteTagTranslation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Редактор на tiptap здесь не проверяется и в jsdom не нужен.
vi.mock('@/components/admin/common/AdminRichTextEditor', () => ({
  AdminRichTextEditor: () => null,
}));

const TAG = { id: 't1', name: 'Tag' } as Tag;

// Секции SEO формы ходят в react-query (выбор картинки из медиатеки).
const render = (ui: ReactElement) =>
  rtlRender(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const payloadOf = (spy: typeof createSpy) =>
  (spy.mock.calls[0]?.[0] as { data: Record<string, unknown> }).data;

describe('tag translation indexable switch (LEGACY-422, T73)', () => {
  beforeEach(() => {
    createSpy.mockClear();
    updateSpy.mockClear();
    translations.current = [];
  });

  it('create sends the unchecked switch as indexable: false', async () => {
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={TAG} />);
    fireEvent.click(screen.getByRole('button', { name: /add translation/i }));

    const box = screen.getByLabelText('Indexable') as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Classics' } });
    fireEvent.click(screen.getByRole('button', { name: /create|save/i }));

    await waitFor(() => expect(createSpy).toHaveBeenCalledTimes(1));
    expect(payloadOf(createSpy)).toMatchObject({ name: 'Classics', indexable: false });
  });

  it('edit starts from the stored flag and sends it back', async () => {
    translations.current = [
      { language: 'en', name: 'Classics', slug: 'classics', indexable: false } as TagTranslation,
    ];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={TAG} />);
    // `Button` дизайн-системы берёт имя из `ariaLabel`, а список передаёт `aria-label`,
    // поэтому доступного имени у кнопки нет: первая кнопка строки — правка.
    const row = screen.getByText('classics').parentElement?.parentElement as HTMLElement;
    fireEvent.click(row.querySelectorAll('button')[0] as HTMLButtonElement);

    const box = screen.getByLabelText('Indexable') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    fireEvent.click(screen.getByRole('button', { name: /update|save/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(payloadOf(updateSpy)).toMatchObject({ indexable: true });
  });

  // Ответ без поля (старый бэкенд, кэш) не должен молча выключить индексацию при сохранении.
  it('edit of a translation without the field starts ticked and sends true', async () => {
    translations.current = [
      { language: 'en', name: 'Classics', slug: 'classics' } as TagTranslation,
    ];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={TAG} />);
    const row = screen.getByText('classics').parentElement?.parentElement as HTMLElement;
    fireEvent.click(row.querySelectorAll('button')[0] as HTMLButtonElement);

    expect((screen.getByLabelText('Indexable') as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /update|save/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(payloadOf(updateSpy)).toMatchObject({ indexable: true });
  });

  it('form passes the switch value to onSubmit', async () => {
    const onSubmit = vi.fn((_data: TranslationFormData) => Promise.resolve());
    render(
      <TranslationForm
        availableLanguages={[{ value: 'en', label: 'English' }]}
        isEditing={false}
        isLoading={false}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Poetry' } });
    fireEvent.click(screen.getByLabelText('Indexable'));
    fireEvent.click(screen.getByRole('button', { name: /create|save/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ name: 'Poetry', indexable: false });
  });
});

// `LEGACY-437`: предел длины слага (100) появился позже записей. Форма перевода обязана передать
// схеме исходный слаг редактируемого перевода, иначе нетронутый длинный слаг запрёт сохранение.
describe('tag translation with a legacy slug longer than the limit (LEGACY-437)', () => {
  beforeEach(() => {
    updateSpy.mockClear();
  });

  it('edit keeps the untouched long slug and saves', async () => {
    const longSlug = 'a'.repeat(101);
    translations.current = [
      { language: 'en', name: 'Classics', slug: longSlug, indexable: true } as TagTranslation,
    ];
    render(<TagTranslationsModal isOpen onClose={vi.fn()} tag={TAG} />);
    const row = screen.getByText(longSlug).parentElement?.parentElement as HTMLElement;
    fireEvent.click(row.querySelectorAll('button')[0] as HTMLButtonElement);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Old classics' } });
    fireEvent.click(screen.getByRole('button', { name: /update|save/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    expect(payloadOf(updateSpy)).toMatchObject({ name: 'Old classics', slug: longSlug });
    expect(screen.queryByText('Slug is too long')).not.toBeInTheDocument();
  });
});
