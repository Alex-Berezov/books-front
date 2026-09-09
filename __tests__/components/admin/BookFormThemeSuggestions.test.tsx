import { act, fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';
import { DetailInfoSection } from '@/components/admin/books/BookForm/DetailInfoSection';
import type { BookFormData } from '@/components/admin/books/BookForm/BookForm.types';

/**
 * 🔴 `LEGACY-016`. Подсказка темы была `div` с `onMouseDown` — с клавиатуры список был
 * недостижим вовсе. При переводе на `<button>` вскрылось второе: список гасился таймером
 * `onBlur` поля ввода на 200 мс, а таймер срабатывает от **любого** ухода фокуса. То есть
 * ровно тот сценарий, ради которого правка делалась (Tab на подсказку), закрывал список
 * под пальцами, а долгий клик мышью терял `click`, потому что кнопка успевала размонтироваться.
 *
 * Поэтому сторож проверяет не разметку, а три поведения: выбор мышью, выбор с клавиатуры
 * и закрытие списка, когда фокус действительно ушёл наружу.
 */

vi.mock('@/api/hooks/useBooks', () => ({
  useThemes: () => ({ data: ['redemption', 'revenge'] }),
}));

const Harness = () => {
  const { register, control, formState, watch, setValue } = useForm<BookFormData>({
    defaultValues: { themes: [] } as unknown as BookFormData,
  });

  return (
    <>
      <button type="button">Кнопка вне формы</button>
      <DetailInfoSection
        register={register}
        control={control}
        errors={formState.errors}
        watch={watch}
        setValue={setValue}
      />
    </>
  );
};

const openSuggestions = (): HTMLInputElement => {
  const input = screen.getByPlaceholderText(
    'Enter theme or select from dropdown...'
  ) as HTMLInputElement;

  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: 're' } });

  return input;
};

describe('подсказки тем в форме версии книги', () => {
  it('подсказка выбирается кликом и добавляет тему', () => {
    render(<Harness />);
    openSuggestions();

    const suggestion = screen.getByRole('button', { name: 'redemption' });
    fireEvent.click(suggestion);

    expect(screen.getByText('redemption')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'revenge' })).not.toBeInTheDocument();
  });

  it('список остаётся открытым, когда фокус переходит на саму подсказку', () => {
    render(<Harness />);
    const input = openSuggestions();

    const suggestion = screen.getByRole('button', { name: 'redemption' });

    // 🔴 Tab с поля ввода на подсказку — это блюр поля. Прежний таймер на 200 мс гасил
    // от него список, и клавиатурный выбор был невозможен в принципе. Время двигается
    // явно: без этого возврат таймера остался бы незамеченным — он гасит список
    // асинхронно, а синхронная проверка успевает раньше него.
    vi.useFakeTimers();
    try {
      fireEvent.focusOut(input, { relatedTarget: suggestion });
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByRole('button', { name: 'redemption' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('список закрывается, когда фокус ушёл за пределы контейнера', () => {
    render(<Harness />);
    const input = openSuggestions();
    const outside = screen.getByRole('button', { name: 'Кнопка вне формы' });

    fireEvent.focusOut(input, { relatedTarget: outside });

    expect(screen.queryByRole('button', { name: 'redemption' })).not.toBeInTheDocument();
  });

  it('нажатие мышью на подсказке не уводит фокус из поля ввода', () => {
    render(<Harness />);
    openSuggestions();

    const suggestion = screen.getByRole('button', { name: 'redemption' });

    // `preventDefault` на `mousedown` — то, чем держится долгий клик: фокус остаётся
    // в поле, список не гаснет, и `click` доходит до кнопки независимо от длительности.
    const prevented = !fireEvent.mouseDown(suggestion);
    expect(prevented).toBe(true);
  });
});
