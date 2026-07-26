import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GeoBlockRulesPanel } from '@/components/admin/books/GeoBlockRulesPanel/GeoBlockRulesPanel';
import type {
  CheckGeoBlockAccessRequest,
  GeoAccessCheckResult,
  GeoBlockRulesResponse,
  VerifyGeoBlockRulesRequest,
} from '@/types/api-schema/geo-block';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  verify: vi.fn(),
  snackbar: vi.fn(),
}));

const rulesResponse: GeoBlockRulesResponse = {
  bookVersionId: 'version-1',
  rules: [
    {
      id: 'rule-1',
      bookId: 'book-1',
      bookVersionId: 'version-1',
      rightsProfileId: 'profile-1',
      territoryDecisionId: 'decision-1',
      scope: 'TEXT_READER',
      countryCode: 'GB',
      accessPolicy: 'BLOCK',
      sourceFinalStatus: 'BLOCKED',
      isActive: true,
      reasonRu: 'Недоступно по правам',
      legalBasisRu: null,
      generatedFrom: 'TERRITORY_DECISION',
      generatedAt: '2026-07-26T12:00:00.000Z',
      verifiedAt: null,
      verifiedByUserId: null,
      verificationNotesRu: null,
      createdAt: '2026-07-26T12:00:00.000Z',
      updatedAt: '2026-07-26T12:00:00.000Z',
    },
  ],
  summary: {
    geoBlockRequired: true,
    configured: false,
    verifiedAt: null,
    lastGeneratedAt: '2026-07-26T12:00:00.000Z',
    totalRulesCount: 1,
    activeRulesCount: 1,
    verifiedRulesCount: 0,
    blockedCountries: ['GB'],
    scopes: ['TEXT_READER'],
  },
};

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar: mocks.snackbar }),
}));

vi.mock('@/api/hooks/useBookVersions', () => ({
  useGeoBlockRules: () => ({
    data: rulesResponse,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useGenerateGeoBlockRules: () => ({
    mutate: mocks.generate,
    isPending: false,
  }),
  useCheckGeoBlockAccess: (options?: { onSuccess?: (result: GeoAccessCheckResult) => void }) => ({
    mutate: (variables: { versionId: string; data: CheckGeoBlockAccessRequest }) => {
      const allowed = variables.data.countryCode === 'US';
      options?.onSuccess?.({
        allowed,
        countryCode: variables.data.countryCode,
        scope: variables.data.scope,
        matchedRuleId: allowed ? null : 'rule-1',
        reasonCode: allowed ? null : 'GEO_BLOCKED_BY_RIGHTS',
        messageRu: allowed ? null : 'Недоступно',
        bookVersionId: variables.versionId,
      });
    },
    isPending: false,
  }),
  useVerifyGeoBlockRules: () => ({
    mutate: mocks.verify,
    isPending: false,
  }),
}));

describe('GeoBlockRulesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders required, generated and unverified rule state', () => {
    render(<GeoBlockRulesPanel versionId="version-1" />);

    expect(screen.getByText('GeoIP Market Blocking')).toBeInTheDocument();
    expect(screen.getByText('Generated, not verified')).toBeInTheDocument();
    expect(screen.getAllByText('GB').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TEXT_READER').length).toBeGreaterThan(0);
  });

  it('calls rule generation', () => {
    render(<GeoBlockRulesPanel versionId="version-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate rules' }));

    expect(mocks.generate).toHaveBeenCalledWith('version-1');
  });

  it('shows blocked and allowed results and then enables verification', () => {
    render(<GeoBlockRulesPanel versionId="version-1" />);
    const verifyButton = screen.getByRole('button', { name: 'Verify geo-block' });

    expect(verifyButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Check access' }));
    expect(screen.getByText(/Blocked for GB/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Country code'), { target: { value: 'US' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check access' }));
    expect(screen.getByText(/Allowed for US/)).toBeInTheDocument();
    expect(verifyButton).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Verification notes'), {
      target: { value: 'Blocked GB and allowed US checked' },
    });
    fireEvent.click(verifyButton);

    expect(mocks.verify).toHaveBeenCalledWith({
      versionId: 'version-1',
      data: {
        verified: true,
        notesRu: 'Blocked GB and allowed US checked',
      } satisfies VerifyGeoBlockRulesRequest,
    });
  });
});
