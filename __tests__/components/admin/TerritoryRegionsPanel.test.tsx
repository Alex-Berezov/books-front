import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RightsProfilePanel } from '@/components/admin/RightsIntakeDetail/RightsProfilePanel/RightsProfilePanel';
import { TerritoryRegionsPanel } from '@/components/admin/RightsIntakeDetail/TerritoryRegionsPanel/TerritoryRegionsPanel';
import type { TerritoryRegionSummary, RightsProfileDetail } from '@/types/api-schema/rights-intake';

vi.mock('@/api/hooks/useRightsIntakes', () => ({
  useCurrentRightsProfile: () => ({ data: null, isLoading: false }),
  useMaterializeRightsReviewImport: () => ({ mutate: vi.fn(), isPending: false }),
  // WP-5.4: чеклист обязательных действий внутри RightsProfilePanel.
  useUpdateRightsAction: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

vi.mock('@/api/hooks/useRightsLicenses', () => ({
  useLinkRightsLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeRightsLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateRightsLicense: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRightsLicense: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/api/hooks/useContributors', () => ({
  useContributors: () => ({ data: { items: [] }, isLoading: false }),
  useCreateContributor: () => ({ mutateAsync: vi.fn() }),
  useLinkSourceEditionContributor: () => ({ mutateAsync: vi.fn() }),
  useUnlinkSourceEditionContributor: () => ({ mutateAsync: vi.fn() }),
  useLinkRightsComponentContributor: () => ({ mutateAsync: vi.fn() }),
  useUnlinkRightsComponentContributor: () => ({ mutateAsync: vi.fn() }),
}));

const mockRegions: TerritoryRegionSummary[] = [
  {
    regionCode: 'US',
    label: 'United States',
    status: 'ALLOWED',
    countryCount: 1,
    targetedCountryCount: 1,
    allowedCountryCount: 1,
    blockedCountryCount: 0,
    licenseRequiredCountryCount: 0,
    pendingReviewCountryCount: 0,
    notTargetedCountryCount: 0,
    geoBlockRequiredCount: 0,
    countries: [
      {
        countryCode: 'US',
        finalStatus: 'PUBLIC_DOMAIN',
        accessPolicy: 'ALLOW',
        geoBlockRequired: false,
        geoBlockScope: null,
        reasonRu: 'Public Domain in US',
        legalBasisRu: 'Life + 70',
        confidence: 'HIGH',
        nextReviewAt: null,
      },
    ],
    blockingReasons: [],
  },
  {
    regionCode: 'EU',
    label: 'European Union',
    status: 'MIXED',
    countryCount: 27,
    targetedCountryCount: 2,
    allowedCountryCount: 1,
    blockedCountryCount: 1,
    licenseRequiredCountryCount: 0,
    pendingReviewCountryCount: 0,
    notTargetedCountryCount: 25,
    geoBlockRequiredCount: 1,
    countries: [
      {
        countryCode: 'FR',
        finalStatus: 'PUBLIC_DOMAIN',
        accessPolicy: 'ALLOW',
        geoBlockRequired: false,
        geoBlockScope: null,
        reasonRu: 'Public Domain in France',
        legalBasisRu: 'Life + 70',
        confidence: 'HIGH',
        nextReviewAt: null,
      },
      {
        countryCode: 'DE',
        finalStatus: 'BLOCKED',
        accessPolicy: 'BLOCK',
        geoBlockRequired: true,
        geoBlockScope: 'COUNTRY_WIDE',
        reasonRu: '70 year post-mortem copyright active',
        legalBasisRu: 'Urheberrecht DE',
        confidence: 'HIGH',
        nextReviewAt: null,
      },
    ],
    blockingReasons: [
      {
        countryCode: 'DE',
        finalStatus: 'BLOCKED',
        accessPolicy: 'BLOCK',
        reasonRu: '70 year post-mortem copyright active',
        legalBasisRu: 'Urheberrecht DE',
      },
    ],
  },
  {
    regionCode: 'CA',
    label: 'Canada',
    status: 'NOT_TARGETED',
    countryCount: 1,
    targetedCountryCount: 0,
    allowedCountryCount: 0,
    blockedCountryCount: 0,
    licenseRequiredCountryCount: 0,
    pendingReviewCountryCount: 0,
    notTargetedCountryCount: 1,
    geoBlockRequiredCount: 0,
    countries: [],
    blockingReasons: [],
  },
];

const mockProfile: RightsProfileDetail = {
  id: 'profile-1',
  rightsIntakeId: 'intake-1',
  currentReviewImportId: 'import-1',
  status: 'ACTIVE',
  isCurrent: true,
  overallStatus: 'APPROVED',
  publicationGate: 'ALLOW',
  confidence: 'HIGH',
  summaryRu: 'Summary',
  conclusionRu: 'Conclusion',
  reasoningRu: null,
  nextReviewAt: null,
  sourceEdition: null,
  reviews: [],
  territoryDecisions: [
    {
      id: 't-1',
      rightsProfileId: 'profile-1',
      countryCode: 'US',
      finalStatus: 'PUBLIC_DOMAIN',
      accessPolicy: 'ALLOW',
      geoBlockRequired: false,
      geoBlockScope: null,
      reasonRu: 'Public Domain in US',
      legalBasisRu: 'Life + 70',
      confidence: 'HIGH',
      nextReviewAt: null,
      createdAt: '2026-07-26T10:00:00Z',
      updatedAt: '2026-07-26T10:00:00Z',
    },
  ],
  regionalTerritorySummary: mockRegions,
  components: [],
  evidence: [],
  actions: [],
  supersededAt: null,
  archivedAt: null,
  createdAt: '2026-07-26T10:00:00Z',
  updatedAt: '2026-07-26T10:00:00Z',
};

describe('TerritoryRegionsPanel (Phase 11)', () => {
  it('renders region summary cards and headers', () => {
    render(<TerritoryRegionsPanel regions={mockRegions} />);

    expect(screen.getByText('Regions & Countries')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('European Union')).toBeInTheDocument();
    expect(screen.getByText('Canada')).toBeInTheDocument();
  });

  it('shows MIXED region with country breakdown and blocking reasons', () => {
    render(<TerritoryRegionsPanel regions={mockRegions} />);

    expect(screen.getByText('MIXED')).toBeInTheDocument();
    expect(screen.getByText(/Problematic Countries & Restrictions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Urheberrecht DE/i).length).toBeGreaterThan(0);
  });

  it('shows NOT_TARGETED region in neutral state and expands on click', () => {
    render(<TerritoryRegionsPanel regions={mockRegions} />);

    expect(screen.getByText('NOT_TARGETED')).toBeInTheDocument();
    const caHeader = screen.getByText('Canada');
    fireEvent.click(caHeader);

    expect(
      screen.getByText(/No specific country decisions recorded in this region/i)
    ).toBeInTheDocument();
  });

  it('RightsProfilePanel renders regional aggregation when regionalTerritorySummary exists', () => {
    render(<RightsProfilePanel profile={mockProfile} />);

    expect(screen.getByText('Regions & Countries')).toBeInTheDocument();
    expect(screen.getByText('Raw Country Decisions (1)')).toBeInTheDocument();
  });

  it('Fallback: RightsProfilePanel still renders raw territory decisions if regionalTerritorySummary missing', () => {
    const profileWithoutRegions = { ...mockProfile, regionalTerritorySummary: undefined };
    render(<RightsProfilePanel profile={profileWithoutRegions} />);

    expect(screen.queryByText('Regions & Countries')).toBeNull();
    expect(screen.getByText('Raw Country Decisions (1)')).toBeInTheDocument();
  });
});
