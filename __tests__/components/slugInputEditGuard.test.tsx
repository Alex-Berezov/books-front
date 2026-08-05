import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlugInput } from '@/components/common/SlugInput/SlugInput';

vi.mock('@/api/hooks/useSlugValidation', () => ({
  useSlugValidation: () => ({
    existingItem: null,
    isUnique: true,
    status: 'idle',
    suggestedSlug: null,
    validate: vi.fn(),
  }),
}));

/**
 * A published slug is a URL. Regenerating it from the title on an ordinary save
 * silently moves that URL — and for a system page it also breaks the lookup that
 * finds the page at all: `homepage-index` became `homepage`, the homepage lost
 * its editorial content, and nothing reported an error.
 */
describe('SlugInput — editing never regenerates the slug', () => {
  it('leaves an existing slug alone when the title changes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SlugInput
        excludeId="page-1"
        entityType="page"
        lang="en"
        onChange={onChange}
        sourceValue="Homepage"
        value="homepage-index"
      />
    );

    rerender(
      <SlugInput
        excludeId="page-1"
        entityType="page"
        lang="en"
        onChange={onChange}
        sourceValue="Homepage Updated"
        value="homepage-index"
      />
    );

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  /**
   * The old guard armed only when value and sourceValue became populated in the
   * same render. A form that hydrates the title first left it disarmed — which is
   * the sequence that actually happened.
   */
  it('survives a form that hydrates the title before the slug', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SlugInput excludeId="page-1" entityType="page" lang="en" onChange={onChange} value="" />
    );

    rerender(
      <SlugInput
        excludeId="page-1"
        entityType="page"
        lang="en"
        onChange={onChange}
        sourceValue="Homepage"
        value=""
      />
    );
    rerender(
      <SlugInput
        excludeId="page-1"
        entityType="page"
        lang="en"
        onChange={onChange}
        sourceValue="Homepage"
        value="homepage-index"
      />
    );

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it('still generates for a new entity, where there is no published URL yet', async () => {
    const onChange = vi.fn();
    render(
      <SlugInput entityType="page" lang="en" onChange={onChange} sourceValue="About Us" value="" />
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('about-us'));
  });
});
