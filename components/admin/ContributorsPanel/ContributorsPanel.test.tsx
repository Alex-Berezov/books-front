import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Contributor, RightsProfileContributor } from '@/types/contributors';
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
    birthYear: 1688,
    deathYear: 1744,
    nationalityCountry: 'GB',
    viafId: '24606633',
    createdAt: '2026-07-27T00:00:00Z',
    updatedAt: '2026-07-27T00:00:00Z',
  };

  const sampleProfileContributor: RightsProfileContributor = {
    id: 'rpc-1',
    rightsProfileId: 'profile-1',
    personId: 'person-1',
    role: 'NARRATOR',
    displayName: 'Juan Pérez',
    confidence: 'HIGH',
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

  it('renders rights profile contributors with role, confidence and person link status', () => {
    render(<ContributorsPanel profileContributors={[sampleProfileContributor]} />);

    expect(screen.getByText('Juan Pérez')).toBeTruthy();
    expect(screen.getByText('Диктор / Чтец')).toBeTruthy();
    expect(screen.getByText('HIGH')).toBeTruthy();
    expect(screen.getByText('Person Linked')).toBeTruthy();
  });

  it('marks contributors without a linked person', () => {
    render(
      <ContributorsPanel
        profileContributors={[{ ...sampleProfileContributor, personId: null, confidence: null }]}
      />
    );

    expect(screen.getByText('No Person')).toBeTruthy();
  });
});
