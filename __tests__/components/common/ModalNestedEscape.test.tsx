import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/common/Modal';

/**
 * A nested dialog is rendered inside the markup of the one that opened it - the
 * editor's image picker sits in a chapter form, the media picker sits in the SEO
 * form. Escape is handled on the overlay, so without stopping the event one
 * press closed both, and the unsaved chapter text underneath went with it
 * (`ChapterModal` resets from `initialData` on the next open).
 */
describe('Modal nested Escape', () => {
  it('closes only the innermost dialog', async () => {
    const user = userEvent.setup();
    const onCancelOuter = vi.fn();
    const onCancelInner = vi.fn();

    render(
      <Modal isOpen onCancel={onCancelOuter} title="Chapter" showFooter={false}>
        <p>Unsaved chapter text</p>
        <Modal isOpen onCancel={onCancelInner} title="Pick an image" showFooter={false}>
          <button type="button">Some file</button>
        </Modal>
      </Modal>
    );

    await user.click(screen.getByRole('button', { name: 'Some file' }));
    await user.keyboard('{Escape}');

    expect(onCancelInner).toHaveBeenCalledTimes(1);
    expect(onCancelOuter).not.toHaveBeenCalled();
  });

  it('still closes a lone dialog on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <Modal isOpen onCancel={onCancel} title="Chapter" showFooter={false}>
        <button type="button">Field</button>
      </Modal>
    );

    await user.click(screen.getByRole('button', { name: 'Field' }));
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
