import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorsToolbar } from '@/components/public/authors/AuthorsToolbar';

const push = vi.fn();
const replace = vi.fn();
let currentParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => currentParams,
}));

const labels = {
  searchLabel: 'Поиск по имени',
  searchPlaceholder: 'Начните вводить имя',
  sortLabel: 'Сортировка',
  sortByName: 'По алфавиту',
  sortByBooks: 'Больше книг',
};

const renderToolbar = (over: Partial<Parameters<typeof AuthorsToolbar>[0]> = {}) =>
  render(<AuthorsToolbar basePath="/ru/authors" labels={labels} search="" sort="name" {...over} />);

const typeSearch = (value: string) => {
  fireEvent.change(screen.getByRole('searchbox'), { target: { value } });
};

describe('AuthorsToolbar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    push.mockClear();
    replace.mockClear();
    currentParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows what was typed immediately but navigates only after the debounce', () => {
    renderToolbar();
    typeSearch('дост');

    expect(screen.getByRole('searchbox')).toHaveValue('дост');
    expect(replace).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/ru/authors?search=%D0%B4%D0%BE%D1%81%D1%82');
  });

  it('navigates once for a burst of keystrokes, not once per key', () => {
    renderToolbar();
    typeSearch('д');
    vi.advanceTimersByTime(100);
    typeSearch('до');
    vi.advanceTimersByTime(100);
    typeSearch('дос');
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledTimes(1);
  });

  // 🔴 Набор имени оставлял бы в истории по записи на каждую паузу, и «назад»
  // уводил бы не на предыдущую страницу, а на предыдущий вариант запроса.
  it('replaces history for search and pushes for sort', () => {
    renderToolbar();
    typeSearch('дост');
    vi.advanceTimersByTime(300);
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(labels.sortByBooks));
    expect(push).toHaveBeenCalledWith('/ru/authors?sort=books');
  });

  /**
   * 🔴 Гонка: за время дебаунса читатель успевает нажать сортировку. Взведённый
   * таймер срабатывал со **старым** снимком адреса и писал `?search=` поверх
   * `?sort=books`, роняя только что выбранную сортировку.
   */
  it('does not let a pending search overwrite a sort chosen inside the debounce window', () => {
    renderToolbar();
    typeSearch('abc');
    vi.advanceTimersByTime(100);

    fireEvent.click(screen.getByText(labels.sortByBooks));
    expect(push).toHaveBeenCalledWith('/ru/authors?sort=books');

    vi.advanceTimersByTime(1000);
    expect(replace).not.toHaveBeenCalled();
  });

  // 🔴 Остаться на пятой странице выдачи, в которой теперь две, — это показать
  // читателю пустоту вместо результата.
  it('drops the page number whenever the selection changes', () => {
    currentParams = new URLSearchParams('page=5');
    renderToolbar();

    fireEvent.click(screen.getByText(labels.sortByBooks));
    expect(push).toHaveBeenCalledWith('/ru/authors?sort=books');

    push.mockClear();
    fireEvent.click(screen.getByText(labels.sortByName));
    expect(push).toHaveBeenCalledWith('/ru/authors');
  });

  it('keeps the sort when the search changes and vice versa', () => {
    currentParams = new URLSearchParams('sort=books');
    renderToolbar({ sort: 'books' });

    typeSearch('дост');
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledWith('/ru/authors?sort=books&search=%D0%B4%D0%BE%D1%81%D1%82');
  });

  it('does not write the default sort into the address', () => {
    currentParams = new URLSearchParams('sort=books');
    renderToolbar({ sort: 'books' });

    fireEvent.click(screen.getByText(labels.sortByName));
    expect(push).toHaveBeenCalledWith('/ru/authors');
  });

  it('clears the search parameter when the field is emptied', () => {
    currentParams = new URLSearchParams('search=дост');
    renderToolbar({ search: 'дост' });

    typeSearch('');
    vi.advanceTimersByTime(300);

    expect(replace).toHaveBeenCalledWith('/ru/authors');
  });

  /**
   * 🔴 Печатают быстрее, чем отвечает сервер: набрали «толс», ушёл переход,
   * за время серверного рендера дописали «той». Пришедший проп откатывал поле
   * к «толс», роняя каретку в конец.
   */
  it('does not clobber what was typed while the navigation was in flight', () => {
    const { rerender } = renderToolbar();
    typeSearch('толс');
    vi.advanceTimersByTime(300);

    typeSearch('толстой');
    rerender(<AuthorsToolbar basePath="/ru/authors" labels={labels} search="толс" sort="name" />);

    expect(screen.getByRole('searchbox')).toHaveValue('толстой');
  });

  it('follows the address when it changed elsewhere', () => {
    const { rerender } = renderToolbar({ search: 'дост' });
    typeSearch('достоевский');

    // «Показать всех» очистила поиск в адресе.
    rerender(<AuthorsToolbar basePath="/ru/authors" labels={labels} search="" sort="name" />);

    expect(screen.getByRole('searchbox')).toHaveValue('');
    // Отложенный переход по прежнему вводу отменён: он написал бы поверх
    // адреса то, что читатель уже оставил позади.
    vi.advanceTimersByTime(1000);
    expect(replace).not.toHaveBeenCalled();
  });

  // Строка поиска на обеих страницах одна и та же, меняется только путь —
  // эффект по `search` молчит, а отложенный переход собран под прежний путь.
  it('cancels a pending search when the path changes to another letter', () => {
    const { rerender } = renderToolbar();
    typeSearch('дост');

    rerender(
      <AuthorsToolbar basePath="/ru/authors/letter/%d0%b4" labels={labels} search="" sort="name" />
    );

    vi.advanceTimersByTime(1000);
    expect(replace).not.toHaveBeenCalled();
  });

  it('caps the input at the length the backend accepts', () => {
    renderToolbar();
    expect(screen.getByRole('searchbox')).toHaveAttribute('maxlength', '100');
  });
});
