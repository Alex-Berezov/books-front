import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PageTable } from '@/components/admin/pages/PageListTable/ui/PageTable';
import type { PageGroup } from '@/types/api-schema';

/**
 * `LEGACY-371`: пока `search`/`status` отвечали 400, эти состояния были
 * недостижимы вовсе. Теперь фильтр работает, и строка таблицы обязана
 * показывать тот перевод, из-за которого группа попала в выдачу: бэкенд
 * отбирает группу по любому совпавшему переводу и состав группы не сужает.
 */
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
    {
      id: 'p-ru',
      language: 'ru',
      slug: 'politika-konfidencialnosti',
      title: 'Политика конфиденциальности',
      status: 'draft',
      updatedAt: '2026-09-02T00:00:00.000Z',
    },
  ],
} as unknown as PageGroup;

const renderTable = (props: { search?: string; statusFilter?: 'draft' | 'published' | 'all' }) =>
  render(
    <PageTable
      groups={[group]}
      lang="en"
      isDeletingPage={false}
      onDelete={vi.fn()}
      search={props.search}
      statusFilter={props.statusFilter}
    />
  );

describe('PageTable — строка представляет совпавший перевод (LEGACY-371)', () => {
  it('без фильтра берёт перевод языка интерфейса', () => {
    renderTable({});

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    expect(screen.queryByText('Политика конфиденциальности')).not.toBeInTheDocument();
  });

  it('под поиском по русскому заголовку показывает русскую строку, а не английскую', () => {
    renderTable({ search: 'Политика' });

    expect(screen.getByText('Политика конфиденциальности')).toBeInTheDocument();
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument();
  });

  it('под фильтром «Draft» показывает черновик, хотя язык интерфейса опубликован', () => {
    renderTable({ statusFilter: 'draft' });

    expect(screen.getByText('Политика конфиденциальности')).toBeInTheDocument();
    expect(screen.queryByText('Privacy Policy')).not.toBeInTheDocument();
  });

  it('поиск и статус объединяются: несовпадение по статусу возвращает к языковому выбору', () => {
    // русский перевод подходит по слову, но не по статусу; английский — наоборот.
    // Совпавших нет вовсе, и строка не должна исчезнуть: группу отобрал бэкенд
    renderTable({ search: 'Политика', statusFilter: 'published' });

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });

  it('ищет и по слагу, не только по заголовку', () => {
    renderTable({ search: 'politika' });

    expect(screen.getByText('Политика конфиденциальности')).toBeInTheDocument();
  });

  it('пробельный поиск фильтром не считается', () => {
    renderTable({ search: '   ' });

    expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
  });
});

describe('SearchForm — потолок длины совпадает с DTO бэкенда (LEGACY-371)', () => {
  it('поле поиска ограничено сотней символов', async () => {
    const { SearchForm } = await import('@/components/admin/pages/PageListTable/ui/SearchForm');

    render(
      <SearchForm
        searchValue=""
        search=""
        onSearchValueChange={vi.fn()}
        onSearch={vi.fn()}
        onClearSearch={vi.fn()}
      />
    );

    // без потолка вставленный длинный заголовок уходит в запрос и возвращается
    // 400-м от `@MaxLength(100)`, а экран показывает поломку вместо «ничего не найдено»
    expect(screen.getByPlaceholderText('Search by title or slug...')).toHaveAttribute(
      'maxlength',
      '100'
    );
  });
});

describe('PageListTable — пустая выдача под фильтром не выдаётся за пустую базу (LEGACY-371)', () => {
  it('под фильтром предлагает сбросить его, а не создать первую страницу', async () => {
    vi.doMock('@/api/hooks', () => ({
      usePages: () => ({ data: { data: [], meta: { total: 0, totalPages: 0 } }, isLoading: false }),
      useDeletePage: () => ({ mutate: vi.fn(), isPending: false }),
    }));

    const { PageListTable } = await import('@/components/admin/pages/PageListTable/PageListTable');

    render(<PageListTable lang="en" />);

    fireEvent.click(screen.getByRole('button', { name: 'Draft' }));

    expect(screen.getByText('No pages match the current search and filter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create Page' })).not.toBeInTheDocument();

    vi.doUnmock('@/api/hooks');
  });
});
