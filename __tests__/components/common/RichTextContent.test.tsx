import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichTextContent } from '@/components/common/RichTextContent';

/**
 * `RichTextContent` is the only place in the product that renders editor HTML,
 * which makes it the one place where the rules protecting the page layout live.
 * If it stops applying its own class, an image pasted into a chapter goes back
 * to overflowing the text column on phones - and nothing else would notice.
 */
describe('RichTextContent', () => {
  it('renders the authored HTML, images included', () => {
    render(<RichTextContent html='<p>Text</p><p><img src="/a.png" alt="A cover" /></p>' />);

    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByAltText('A cover')).toHaveAttribute('src', '/a.png');
  });

  it('always carries its own class, so the image rules apply', () => {
    const { container } = render(<RichTextContent html="<p>Text</p>" />);

    const block = container.firstElementChild;

    expect(block).not.toBeNull();
    expect(block?.className).not.toBe('');
  });

  it('keeps the class of the page it sits on alongside its own', () => {
    const { container } = render(<RichTextContent html="<p>Text</p>" className="page-class" />);

    const block = container.firstElementChild as HTMLElement;

    expect(block).toHaveClass('page-class');
    // The caller's class is added, not substituted: losing ours would silently
    // drop the image constraints.
    expect(block.className.split(' ').length).toBeGreaterThan(1);
  });

  it('passes an id through for callers wiring aria-controls', () => {
    const { container } = render(<RichTextContent html="<p>Text</p>" id="desc-1" />);

    expect(container.firstElementChild).toHaveAttribute('id', 'desc-1');
  });

  it('preserves inline alignment written by the editor', () => {
    const { container } = render(
      <RichTextContent html='<p style="text-align: center">Centred</p>' />
    );

    expect(container.querySelector('p')).toHaveStyle({ textAlign: 'center' });
  });
});
