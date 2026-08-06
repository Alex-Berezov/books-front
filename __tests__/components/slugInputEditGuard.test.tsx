import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SlugInput } from '@/components/common/SlugInput/SlugInput';

// The path matters: an earlier version of this file mocked '@/api/hooks/…',
// which does not exist, so the mock was inert and the real hook ran.
vi.mock('@/lib/hooks/useSlugValidation', () => ({
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
        entityType="page"
        excludeId="page-1"
        lang="en"
        mode="edit"
        onChange={onChange}
        sourceValue="Homepage"
        value="homepage-index"
      />
    );

    rerender(
      <SlugInput
        entityType="page"
        excludeId="page-1"
        lang="en"
        mode="edit"
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
      <SlugInput entityType="page" lang="en" mode="edit" onChange={onChange} value="" />
    );

    rerender(
      <SlugInput
        entityType="page"
        lang="en"
        mode="edit"
        onChange={onChange}
        sourceValue="Homepage"
        value=""
      />
    );
    rerender(
      <SlugInput
        entityType="page"
        lang="en"
        mode="edit"
        onChange={onChange}
        sourceValue="Homepage"
        value="homepage-index"
      />
    );

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  /**
   * The guard must not depend on `excludeId`. Three of the five forms using this
   * component never pass it — categories, tags and authors — so inferring "this
   * record already exists" from it protected only two of them.
   */
  it('holds without excludeId, which most edit forms do not pass', async () => {
    const onChange = vi.fn();
    render(
      <SlugInput
        entityType="category"
        mode="edit"
        onChange={onChange}
        sourceValue="Poetry Renamed"
        value="poetry"
      />
    );

    await waitFor(() => expect(onChange).not.toHaveBeenCalled());
  });

  it('still generates for a new entity, where there is no published URL yet', async () => {
    const onChange = vi.fn();
    render(
      <SlugInput
        entityType="page"
        lang="en"
        mode="create"
        onChange={onChange}
        sourceValue="About Us"
        value=""
      />
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('about-us'));
  });

  /**
   * Modals are mounted once and reused, so the "typed by hand" lock has to be
   * released when the same instance moves on to a different record.
   */
  it('generates again after a reused form switches back to create', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SlugInput
        entityType="category"
        mode="edit"
        onChange={onChange}
        sourceValue="Adventure"
        value="adventure"
      />
    );

    rerender(
      <SlugInput
        entityType="category"
        mode="create"
        onChange={onChange}
        sourceValue="Mystery"
        value=""
      />
    );

    await waitFor(() => expect(onChange).toHaveBeenCalledWith('mystery'));
  });
});
