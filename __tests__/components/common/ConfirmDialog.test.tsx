import { useState, type FC } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { ConfirmDialogProps } from '@/components/common/ConfirmDialog';

const baseProps: ConfirmDialogProps = {
  isOpen: true,
  title: 'Remove book?',
  content: 'The book will leave your shelf.',
  confirmText: 'Remove',
  cancelText: 'Cancel',
  onConfirm: () => undefined,
  onCancel: () => undefined,
};

/** Страница с кнопкой, открывающей окно, — как полка: окно закрывает только `onCancel`. */
const Harness: FC<{ loading?: boolean }> = ({ loading = false }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <ConfirmDialog
        {...baseProps}
        isOpen={open}
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </>
  );
};

describe('ConfirmDialog', () => {
  it('ничего не рисует закрытым', () => {
    render(<ConfirmDialog {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('рисует диалог с заголовком и текстом и забирает фокус', () => {
    render(<ConfirmDialog {...baseProps} />);
    const dialog = screen.getByRole('dialog', { name: 'Remove book?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('The book will leave your shelf.');
    expect(dialog).toHaveFocus();
  });

  it('Escape закрывает окно', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('кнопки зовут свои обработчики', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} onConfirm={onConfirm} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('во время загрузки Escape и «Отмена» окно не закрывают', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} loading onCancel={onCancel} />);

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    // Кнопку жмём событием напрямую: `user.click` по `disabled` ничего не шлёт,
    // и тест прошёл бы даже без блокировки в самом окне.
    screen.getByRole('button', { name: 'Cancel' }).removeAttribute('disabled');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('клик по подложке окно не закрывает', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog {...baseProps} onCancel={onCancel} />);

    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    await user.click(overlay);

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('после закрытия фокус возвращается на кнопку, открывшую окно', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });

    await user.click(opener);
    expect(screen.getByRole('dialog')).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('с danger кнопка подтверждения получает красный модификатор', () => {
    const { rerender } = render(<ConfirmDialog {...baseProps} />);
    const plainClass = screen.getByRole('button', { name: 'Remove' }).className;

    rerender(<ConfirmDialog {...baseProps} danger />);

    expect(screen.getByRole('button', { name: 'Remove' }).className).not.toBe(plainClass);
  });
});
