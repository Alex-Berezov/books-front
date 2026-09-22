import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RichTextEditor } from '@/components/common/RichTextEditor';
import type { RichTextImagePickerProps } from '@/components/common/RichTextEditor';

/**
 * The editor sits in eight admin forms and, until this file, ran zero times in
 * the suite: both form tests replace it with a plain `<textarea>`. Those mocks
 * are right for what they test, which is why the editor needs a test of its
 * own - otherwise a broken extension ships unnoticed.
 *
 * Assertions look at the HTML the editor emits rather than at cursor position:
 * ProseMirror measures the DOM for the latter, and jsdom has no layout.
 */
describe('RichTextEditor', () => {
  /**
   * Stands in for the media library. A real picker would reach `GET /media`,
   * and msw is set up without `onUnhandledRequest`, so an unmatched request
   * goes to the network - green here, flaky the moment a backend listens on
   * the same port.
   */
  const StubImagePicker = ({ isOpen, onSelect }: RichTextImagePickerProps) =>
    isOpen ? (
      <button type="button" onClick={() => onSelect({ url: '/picked.png', alt: 'Picked' })}>
        Pick this image
      </button>
    ) : null;

  const setup = (value = '<p>Hello</p>', extraProps: Record<string, unknown> = {}) => {
    const onChange = vi.fn();
    render(<RichTextEditor value={value} onChange={onChange} {...extraProps} />);
    return { onChange };
  };

  const lastHtml = (onChange: ReturnType<typeof vi.fn>): string =>
    onChange.mock.calls[onChange.mock.calls.length - 1][0] as string;

  it('renders the editable area with the formatting toolbar', async () => {
    setup();

    expect(await screen.findByRole('toolbar', { name: 'Text formatting' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('offers all four alignments', async () => {
    setup();

    await screen.findByRole('toolbar', { name: 'Text formatting' });

    for (const label of ['Align left', 'Align center', 'Align right', 'Justify']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('writes the chosen alignment into the emitted HTML', async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.click(await screen.findByRole('button', { name: 'Align center' }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastHtml(onChange)).toContain('text-align: center');
  });

  it('marks the active alignment as pressed', async () => {
    const user = userEvent.setup();
    setup();

    const centre = await screen.findByRole('button', { name: 'Align center' });
    await user.click(centre);

    await waitFor(() => expect(centre).toHaveAttribute('aria-pressed', 'true'));
  });

  it('keeps the active mark in step with the caret', async () => {
    const user = userEvent.setup();
    setup('<p>Hello</p>');

    const bold = await screen.findByRole('button', { name: 'Bold' });
    expect(bold).toHaveAttribute('aria-pressed', 'false');

    await user.click(bold);

    // TipTap 3 stops re-rendering on transactions unless the toolbar subscribes
    // to editor state; without that subscription this stays "false".
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'));
  });

  it('keeps existing content when alignment is applied', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('<p>Hello</p>');

    await user.click(await screen.findByRole('button', { name: 'Align right' }));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastHtml(onChange)).toContain('Hello');
  });

  it('hides the alignment group when the caller turns it off', async () => {
    setup('<p>Hello</p>', { enableAlignment: false });

    await screen.findByRole('toolbar', { name: 'Text formatting' });

    expect(screen.queryByRole('button', { name: 'Align center' })).not.toBeInTheDocument();
    // The rest of the toolbar is untouched.
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
  });

  it('turns alignment off entirely, shortcuts included', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('<p>Hello</p>', { enableAlignment: false });

    const textbox = await screen.findByRole('textbox');
    await user.click(textbox);
    // TextAlign ships Mod-Shift-L/E/R/J of its own. Hiding the buttons while
    // leaving the extension registered would still let this store
    // `style="text-align: center"` in a field rendered as plain text.
    await user.keyboard('{Control>}{Shift>}e{/Shift}{/Control}');

    const emitted = onChange.mock.calls.map((call) => call[0] as string).join('');
    expect(emitted).not.toContain('text-align');
  });

  it('shows no image button when no picker is supplied', async () => {
    setup();

    await screen.findByRole('toolbar', { name: 'Text formatting' });

    expect(screen.queryByRole('button', { name: 'Insert image' })).not.toBeInTheDocument();
  });

  it('inserts the picked image and never opens a browser prompt', async () => {
    const user = userEvent.setup();
    // A `window.prompt` would block the page and would let an editor paste a
    // third-party URL that dies with someone else's host.
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const { onChange } = setup('<p>Hello</p>', { imagePicker: StubImagePicker });

    await user.click(await screen.findByRole('button', { name: 'Insert image' }));
    await user.click(await screen.findByRole('button', { name: 'Pick this image' }));

    await waitFor(() => expect(lastHtml(onChange)).toContain('src="/picked.png"'));
    expect(lastHtml(onChange)).toContain('alt="Picked"');
    expect(promptSpy).not.toHaveBeenCalled();
    promptSpy.mockRestore();
  });

  it('renders an image already present in the value', async () => {
    setup('<p><img src="/cover.png" alt="Cover" /></p>', { imagePicker: StubImagePicker });

    expect(await screen.findByAltText('Cover')).toHaveAttribute('src', '/cover.png');
  });

  it('drops an image from the value when the field takes no images', async () => {
    const { onChange } = setup('<p>Hello <img src="/cover.png" alt="Cover" /></p>');

    await screen.findByRole('textbox');

    // A field with no picker is not meant to hold images, and leaving the
    // extension registered would let one in through a paste from another page.
    expect(screen.queryByAltText('Cover')).not.toBeInTheDocument();
    expect(screen.getByText(/Hello/)).toBeInTheDocument();
    // Dropping the node is a document change, so the form is told the value was
    // normalised rather than left believing the image is still stored.
    await waitFor(() => expect(lastHtml(onChange)).not.toContain('<img'));
    expect(lastHtml(onChange)).toContain('Hello');
  });

  it('disables the new controls when the editor is disabled', async () => {
    setup('<p>Hello</p>', { disabled: true, imagePicker: StubImagePicker });

    await screen.findByRole('toolbar', { name: 'Text formatting' });

    expect(screen.getByRole('button', { name: 'Align center' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Insert image' })).toBeDisabled();
  });

  it('still reports an emptied document as an empty string', async () => {
    const user = userEvent.setup();
    const { onChange } = setup('<p>Hello</p>');

    await user.clear(await screen.findByRole('textbox'));

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastHtml(onChange)).toBe('');
  });
});
