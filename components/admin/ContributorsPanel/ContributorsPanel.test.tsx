import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Contributor } from '@/types/contributors';
import { ContributorsPanel } from './ContributorsPanel';

vi.mock('@/api/hooks/useContributors', () => ({
  useContributors: () => ({ data: { items: [] }, isLoading: false }),
  useCreateContributor: () => ({ mutateAsync: vi.fn() }),
  useLinkSourceEditionContributor: () => ({ mutateAsync: vi.fn() }),
  useUnlinkSourceEditionContributor: () => ({ mutateAsync: vi.fn() }),
  useLinkRightsComponentContributor: () => ({ mutateAsync: vi.fn() }),
  useUnlinkRightsComponentContributor: () => ({ mutateAsync: vi.fn() }),
}));

describe('ContributorsPanel', () => {
  const sampleContributor: Contributor = {
    id: 'c-1',
    displayName: 'Alexander Pope',
    originalName: 'Alexander Pope',
    birthYear: 1688,
    deathYear: 1744,
    nationalityCountry: 'GB',
    viafId: '24606633',
    identityConfidence: 'CONFIRMED',
    createdAt: '2026-07-27T00:00:00Z',
    updatedAt: '2026-07-27T00:00:00Z',
  };

  it('renders empty message when no items', () => {
    render(<ContributorsPanel items={[]} />);
    expect(screen.getByText(/Участники пока не привязаны/i)).toBeTruthy();
  });

  it('renders contributor card with name, role and life dates', () => {
    render(
      <ContributorsPanel
        items={[
          {
            linkId: 'link-1',
            contributor: sampleContributor,
            role: 'TRANSLATOR',
            creditedName: 'A. Pope',
          },
        ]}
      />
    );

    expect(screen.getByText('Alexander Pope')).toBeTruthy();
    expect(screen.getByText('Переводчик')).toBeTruthy();
    expect(screen.getByText(/Годы жизни: 1688–1744/i)).toBeTruthy();
    expect(screen.getByText(/GB/i)).toBeTruthy();
  });
});
