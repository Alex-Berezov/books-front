import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LegalPage } from '@/components/public/legal/LegalPage';
import type { LegalDocument } from '@/content/legal/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/privacy',
}));

const document: LegalDocument = {
  page: 'privacy',
  lang: 'en',
  metaTitle: 'Meta',
  metaDescription: 'Meta description',
  title: 'Privacy Policy',
  updatedAt: '2026-06-11',
  toc: false,
  sections: [
    {
      id: 's1',
      heading: '1. First',
      blocks: [{ kind: 'paragraph', content: [{ kind: 'text', text: 'First body.' }] }],
    },
    {
      id: 's2',
      heading: '2. Second',
      blocks: [
        { kind: 'paragraph', content: [{ kind: 'text', text: 'Lead:' }] },
        {
          kind: 'list',
          items: [[{ kind: 'text', text: 'one;' }], [{ kind: 'text', text: 'two.' }]],
        },
        {
          kind: 'paragraph',
          content: [
            { kind: 'text', text: 'Write to ' },
            { kind: 'mailto', text: 'help@example.com', email: 'help@example.com' },
            { kind: 'text', text: '.' },
          ],
        },
      ],
    },
  ],
};

describe('LegalPage', () => {
  it('renders one h1, h2 with anchors, list items in order and the update date', () => {
    render(<LegalPage document={document} />);

    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      'Privacy Policy',
    ]);
    const h2 = screen.getAllByRole('heading', { level: 2 });
    expect(h2.map((h) => h.textContent)).toEqual(['1. First', '2. Second']);
    expect(h2.map((h) => h.id)).toEqual(['s1', 's2']);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['one;', 'two.']);
    expect(screen.getByText('Last updated: June 11, 2026')).toBeInTheDocument();
  });

  it('renders an address as a mailto link inside the surrounding sentence', () => {
    const { container } = render(<LegalPage document={document} />);

    expect(screen.getByRole('link', { name: 'help@example.com' })).toHaveAttribute(
      'href',
      'mailto:help@example.com'
    );
    // Without its own class the link inherits the global `a` reset and blends into the text.
    expect(screen.getByRole('link', { name: 'help@example.com' }).className).toMatch(/\S/);
    expect(container.textContent).toContain('Write to help@example.com.');
  });

  it('formats the date in the page language', () => {
    render(<LegalPage document={{ ...document, lang: 'ru' }} />);

    expect(screen.getByText(/11 июня 2026/)).toBeInTheDocument();
  });
});
