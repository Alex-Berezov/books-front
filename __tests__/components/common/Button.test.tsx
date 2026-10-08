import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/common/Button';

// LEGACY-442: кнопка сайта заменила обёртку над antd. Здесь — то поведение antd,
// на которое опираются формы и ссылки сайта и которое не видно глазами.
describe('Button (сайт, без antd)', () => {
  it('во время загрузки не отправляет форму ни кликом, ни по Enter', async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <input aria-label="email" />
        <Button type="submit" loading>
          Sign in
        </Button>
      </form>
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await user.type(screen.getByLabelText('email'), 'a{Enter}');

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('без загрузки отправляет форму', async () => {
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    render(
      <form onSubmit={(event) => onSubmit(event.nativeEvent)}>
        <Button type="submit">Sign in</Button>
      </form>
    );

    await userEvent.setup().click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('во время загрузки не зовёт onClick и помечена aria-busy', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>
    );
    const button = screen.getByRole('button', { name: 'Save' });

    await userEvent.setup().click(button);

    expect(onClick).not.toHaveBeenCalled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('с href рисуется ссылкой и пропускает атрибуты next/link (префетч по наведению)', () => {
    const onMouseEnter = vi.fn();
    render(
      <Button href="/en/catalog" onMouseEnter={onMouseEnter} data-testid="browse">
        Browse
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Browse' });

    fireEvent.mouseEnter(link);

    expect(link).toHaveAttribute('href', '/en/catalog');
    expect(link).toHaveAttribute('data-testid', 'browse');
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });

  it('неактивная ссылка не переходит и помечена aria-disabled', () => {
    const onClick = vi.fn();
    render(
      <Button href="/en/catalog" disabled onClick={onClick}>
        Browse
      </Button>
    );
    const link = screen.getByRole('link', { name: 'Browse' });

    const notCancelled = fireEvent.click(link);

    expect(notCancelled).toBe(false);
    expect(onClick).not.toHaveBeenCalled();
    expect(link).toHaveAttribute('aria-disabled', 'true');
  });

  it('кнопка из одной иконки получает доступное имя из ariaLabel', () => {
    render(<Button leftIcon={<svg />} ariaLabel="Remove" />);

    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
  });
});
