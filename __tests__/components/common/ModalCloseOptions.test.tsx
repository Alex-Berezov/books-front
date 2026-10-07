import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/common/Modal';

/**
 * A chapter form holds long formatted text. A click that missed the dialog, or a
 * stray Escape, closed it and the unsaved text was lost, so a form can turn both
 * off and close only by the cross or Cancel. Every other dialog keeps the defaults.
 */
describe('Modal close options', () => {
  it('closes on overlay click and Escape by default', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <Modal isOpen onCancel={onCancel} title="Tag" showFooter={false}>
        <button type="button">Field</button>
      </Modal>
    );

    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Field' }));
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('ignores overlay click and Escape when both are off, cross and Cancel still close', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <Modal
        isOpen
        onCancel={onCancel}
        title="Chapter"
        closeOnOverlayClick={false}
        closeOnEscape={false}
      >
        <button type="button">Field</button>
      </Modal>
    );

    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    await user.click(screen.getByRole('button', { name: 'Field' }));
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['with Escape off', { closeOnEscape: false }],
    ['while loading', { isLoading: true }],
  ] as const)(
    'Escape in a nested dialog %s does not reach the outer one',
    async (_case, innerProps) => {
      const user = userEvent.setup();
      const onCancelOuter = vi.fn();
      const onCancelInner = vi.fn();

      render(
        <Modal isOpen onCancel={onCancelOuter} title="Outer" showFooter={false}>
          <Modal isOpen onCancel={onCancelInner} title="Inner" showFooter={false} {...innerProps}>
            <button type="button">Some file</button>
          </Modal>
        </Modal>
      );

      await user.click(screen.getByRole('button', { name: 'Some file' }));
      await user.keyboard('{Escape}');

      expect(onCancelInner).not.toHaveBeenCalled();
      expect(onCancelOuter).not.toHaveBeenCalled();
    }
  );
});

/**
 * Selecting text in a field and releasing the mouse outside the dialog sends `click`
 * to the common ancestor — the overlay. That must not close a form with unsaved input.
 */
describe('Modal overlay mousedown origin', () => {
  it('stays open when mousedown started inside, closes when it started on the overlay', () => {
    const onCancel = vi.fn();

    render(
      <Modal isOpen onCancel={onCancel} title="Tag" showFooter={false}>
        <input aria-label="Field" />
      </Modal>
    );

    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;

    fireEvent.mouseDown(screen.getByLabelText('Field'));
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay);
    expect(onCancel).not.toHaveBeenCalled();

    // Нажал на подложке, отпустил в поле — тоже не закрывает.
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(screen.getByLabelText('Field'));
    fireEvent.click(overlay);
    expect(onCancel).not.toHaveBeenCalled();

    // Клик без нажатия не судится по целям прошлого клика.
    fireEvent.click(overlay);
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(overlay);
    fireEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
