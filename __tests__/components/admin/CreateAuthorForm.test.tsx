import type { ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CreateAuthorForm } from '@/components/admin/authors/CreateAuthorForm';

const baseProps: ComponentProps<typeof CreateAuthorForm> = {
  formData: { name: 'Leo Tolstoy' },
  errors: {},
  generatedSlug: 'leo-tolstoy',
  finalSlug: 'leo-tolstoy',
  slugError: null,
  slugCheckFailed: false,
  isValidatingSlug: false,
  isPending: false,
  onInputChange: () => vi.fn(),
};

/**
 * LEGACY-370: каждый исход проверки слага виден админу, а не только лежит в состоянии хука.
 */
describe('CreateAuthorForm shows the slug check outcome (LEGACY-370)', () => {
  it('warns when the check could not answer', () => {
    render(<CreateAuthorForm {...baseProps} slugCheckFailed />);

    expect(screen.getByText(/Could not verify slug uniqueness/i)).toBeInTheDocument();
  });

  it('shows the taken slug error and the suggested alternative', () => {
    render(
      <CreateAuthorForm
        {...baseProps}
        finalSlug="leo-tolstoy-2"
        slugError='Slug "leo-tolstoy" is already taken'
      />
    );

    expect(screen.getByText('Slug "leo-tolstoy" is already taken')).toBeInTheDocument();
    expect(screen.getByText(/leo-tolstoy-2/)).toBeInTheDocument();
    expect(screen.getByText(/suggested alternative/i)).toBeInTheDocument();
    expect(screen.queryByText(/Could not verify slug uniqueness/i)).not.toBeInTheDocument();
  });

  it('shows neither warning for a free slug', () => {
    render(<CreateAuthorForm {...baseProps} />);

    expect(screen.queryByText(/Could not verify slug uniqueness/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/already taken/i)).not.toBeInTheDocument();
  });
});
